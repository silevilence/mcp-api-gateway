// ============================================================
// 项目级 MCP 服务 · 管理每个项目的独立 McpServer 实例
// ============================================================
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { Request, Response } from 'express';
import * as nodeService from './nodeService.js';
import { execute as sandboxExecute } from './sandboxService.js';
import { handleVision } from './visionService.js';
import type { VisionRequest } from './visionService.js';
import type { VisionCapability } from '../../shared/types.js';

// ---- 类型 ----
interface SessionEntry {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

/** 按项目 slug 隔离的会话池 */
const projectSessions = new Map<string, Map<string, SessionEntry>>();
const SESSION_TTL = 30 * 60 * 1000;
const sessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ---- 会话管理 ----
function sessionKey(slug: string, sessionId: string): string {
  return `${slug}::${sessionId}`;
}

function refreshSessionTimer(slug: string, sessionId: string): void {
  const key = sessionKey(slug, sessionId);
  const existing = sessionTimers.get(key);
  if (existing) clearTimeout(existing);
  sessionTimers.set(key, setTimeout(() => {
    destroySession(slug, sessionId);
  }, SESSION_TTL));
}

async function destroySession(slug: string, sessionId: string): Promise<void> {
  const key = sessionKey(slug, sessionId);
  const pool = projectSessions.get(slug);
  if (pool) {
    const entry = pool.get(sessionId);
    if (entry) {
      try { await entry.server.close(); } catch { /* ignore */ }
      try { await entry.transport.close(); } catch { /* ignore */ }
      pool.delete(sessionId);
    }
    if (pool.size === 0) projectSessions.delete(slug);
  }
  const timer = sessionTimers.get(key);
  if (timer) { clearTimeout(timer); sessionTimers.delete(key); }
}

/** 清理指定项目的所有会话 */
export async function destroyProjectSessions(slug: string): Promise<void> {
  const pool = projectSessions.get(slug);
  if (!pool) return;
  for (const [sessionId] of pool) {
    await destroySession(slug, sessionId);
  }
}

// ---- Tool Schema 映射 ----
function mapParamToZod(param: import('../../shared/types.js').ApiParam): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  switch (param.type) {
    case 'string': base = z.string(); break;
    case 'number': case 'integer': base = z.number(); break;
    case 'boolean': base = z.boolean(); break;
    case 'date': base = z.string(); break;
    default: base = z.string();  // object, array 等复杂类型用 string
  }
  if (!param.required) base = base.optional();
  if (param.description) base = base.describe(param.description);
  return base;
}

// ---- 工厂函数 ----
function createProjectServer(projectId: string, slug: string): McpServer {
  const server = new McpServer({
    name: `mcp-${slug}`,
    version: '0.1.0',
  });

  // 获取该项目下已注册为 Tool 的节点（所有类型项目统一处理）
  const allNodes = nodeService.listNodes(projectId);
  const toolNodes = allNodes.filter(
    (n) => n.slug && n.mcpToolEnabled && !n.hidden,
  );

  for (const node of toolNodes) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const param of node.params) {
      shape[param.key] = mapParamToZod(param);
    }

    const toolName = node.slug!;
    const toolDesc = node.description || node.name;

    // vision 类型节点 → 使用 visionService 执行
    if (node.source === 'vision') {
      const visionTool = node.slug as VisionCapability;
      if (Object.keys(shape).length > 0) {
        server.tool(toolName, toolDesc, shape, async (args) => {
          const params: VisionRequest = {
            tool: visionTool,
            ...args as Record<string, unknown>,
          };
          // 注入节点绑定的模型 ID
          if (node.boundModelId) {
            params.modelId = node.boundModelId;
          }
          const result = await handleVision(params);
          return {
            content: [{ type: 'text' as const, text: result.text }],
          };
        });
      } else {
        server.tool(toolName, toolDesc, {}, async () => {
          const params: VisionRequest = { tool: visionTool };
          if (node.boundModelId) {
            params.modelId = node.boundModelId;
          }
          const result = await handleVision(params);
          return {
            content: [{ type: 'text' as const, text: result.text }],
          };
        });
      }
    } else {
      // 原有 HTTP 沙箱执行路径
      if (Object.keys(shape).length > 0) {
        server.tool(toolName, toolDesc, shape, async (args) => {
          const response = await sandboxExecute(node.id, args as Record<string, unknown>);
          return {
            content: [{
              type: 'text' as const,
              text: `[${response.statusCode}] ${response.responseTimeMs}ms\n\n${response.body}`,
            }],
          };
        });
      } else {
        server.tool(toolName, toolDesc, {}, async () => {
          const response = await sandboxExecute(node.id, {});
          return {
            content: [{
              type: 'text' as const,
              text: `[${response.statusCode}] ${response.responseTimeMs}ms\n\n${response.body}`,
            }],
          };
        });
      }
    }
  }

  // 占位工具
  if (toolNodes.length === 0) {
    server.tool(
      '_noop',
      'Placeholder tool to ensure tools/list endpoint is functional.',
      {},
      async () => ({
        content: [{ type: 'text' as const, text: 'No tools registered for this project yet.' }],
      }),
    );
  }

  return server;
}

// ---- 处理项目级 MCP 请求 ----
export async function handleProjectMcpRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const slug = req.params.slug as string;
  const projectId = (req as Request & { projectId: string }).projectId;

  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // 确保项目会话池存在
    if (!projectSessions.has(slug)) {
      projectSessions.set(slug, new Map());
    }
    const pool = projectSessions.get(slug)!;

    // 已有会话 → 复用 transport
    if (sessionId && pool.has(sessionId)) {
      const entry = pool.get(sessionId)!;
      refreshSessionTimer(slug, sessionId);
      await entry.transport.handleRequest(req, res, req.body);
      return;
    }

    // 新会话 → initialize 请求（标准有状态流程）
    if (!sessionId && isInitializeRequest(req.body)) {
      const server = createProjectServer(projectId, slug);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (newSessionId) => {
          pool.set(newSessionId, { server, transport });
          refreshSessionTimer(slug, newSessionId);
          console.log(`[projectMcp:${slug}] 新会话已建立: ${newSessionId}`);
        },
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // 兼容模式：无会话 ID 的非 initialize 请求
    console.log(`[projectMcp:${slug}] oneshot 兼容模式：${req.body?.method ?? '未知方法'}`);
    const server = createProjectServer(projectId, slug);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      await transport.handleRequest(req, res, req.body);
    } finally {
      try { await server.close(); } catch { /* ignore */ }
      try { await transport.close(); } catch { /* ignore */ }
    }
  } catch (err) {
    console.error(`[projectMcp:${slug}] 请求处理异常:`, err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'MCP 服务内部错误' },
        id: req.body?.id ?? null,
      });
    }
  }
}

/** 获取项目级 MCP 的 Tool 数量（供 discover_services 使用） */
export function getProjectToolCount(projectId: string): number {
  const nodes = nodeService.listNodes(projectId);
  return nodes.filter((n) => n.slug && n.mcpToolEnabled && !n.hidden).length;
}
