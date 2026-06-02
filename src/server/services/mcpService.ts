// ============================================================
// MCP 服务引擎 · 基于 streamableHttp 协议
// 参考官方示例：jsonResponseStreamableHttp.js
// ============================================================
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { Request, Response } from 'express';
import * as projectService from './projectService.js';
import * as nodeService from './nodeService.js';
import { getRecentLogsAsync } from './auditService.js';
import { getProjectToolCount } from './projectMcpService.js';
import type { McpNodeInfo } from '../../shared/types.js';

/**
 * 会话存储：sessionId → { server, transport }
 * 每个 MCP 会话需要独立的 Server + Transport 对（Protocol 限制：一个 Server 只连一个 Transport）
 */
interface SessionEntry {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

const sessions = new Map<string, SessionEntry>();

/** 定期清理过期会话（30 分钟无活动视为过期） */
const SESSION_TTL = 30 * 60 * 1000;
const sessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function refreshSessionTimer(sessionId: string): void {
  const existing = sessionTimers.get(sessionId);
  if (existing) clearTimeout(existing);
  sessionTimers.set(sessionId, setTimeout(() => {
    destroySession(sessionId);
  }, SESSION_TTL));
}

async function destroySession(sessionId: string): Promise<void> {
  const entry = sessions.get(sessionId);
  if (entry) {
    try { await entry.server.close(); } catch { /* ignore */ }
    try { await entry.transport.close(); } catch { /* ignore */ }
    sessions.delete(sessionId);
  }
  const timer = sessionTimers.get(sessionId);
  if (timer) { clearTimeout(timer); sessionTimers.delete(sessionId); }
}

/**
 * 工厂函数：创建一个预配置好所有工具的新 McpServer 实例
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-api-gateway',
    version: '0.1.0',
  });

  // ---- 项目集管理工具 ----

  server.tool('list_projects', '列出所有 API 项目集（策略容器）', {}, async () => {
    const projects = projectService.listProjects();
    return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
  });

  server.tool('get_project', '获取单个 API 项目集的详细信息',
    { id: z.string().describe('项目 ID') },
    async ({ id }) => {
      const project = projectService.getProject(id);
      if (!project) return { content: [{ type: 'text', text: `项目 ${id} 不存在` }] };
      return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
    },
  );

  server.tool('create_project', '创建新的 API 项目集', {
    name: z.string().describe('项目名称'),
    description: z.string().optional().describe('项目描述'),
    type: z.enum(['custom', 'openapi', 'filesystem']).describe('项目类型：custom、openapi 或 filesystem'),
    sourceUrl: z.string().optional().describe('OpenAPI 远程 URL（openapi 类型专用）'),
    workspaceRoot: z.string().optional().describe('工作区根目录（filesystem 类型专用）'),
  }, async ({ name, description, type, sourceUrl, workspaceRoot }) => {
    const project = projectService.createProject({ name, description, type, sourceUrl, workspaceRoot });
    return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
  });

  server.tool('update_project', '更新 API 项目集信息', {
    id: z.string().describe('项目 ID'),
    name: z.string().optional().describe('新名称'),
    description: z.string().optional().describe('新描述'),
    sourceUrl: z.string().optional().describe('新 OpenAPI URL'),
  }, async ({ id, name, description, sourceUrl }) => {
    const updated = projectService.updateProject(id, { name, description, sourceUrl });
    if (!updated) return { content: [{ type: 'text', text: `项目 ${id} 不存在` }] };
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  });

  server.tool('delete_project', '删除 API 项目集及其下所有节点',
    { id: z.string().describe('项目 ID') },
    async ({ id }) => {
      const ok = projectService.deleteProject(id);
      return { content: [{ type: 'text', text: ok ? `项目 ${id} 及其全部节点已删除` : `项目 ${id} 不存在` }] };
    },
  );

  // ---- API 节点管理工具 ----

  server.tool('list_nodes', '列出 API 节点，可按项目 ID 过滤', {
    projectId: z.string().optional().describe('所属项目 ID（可选过滤条件）'),
  }, async ({ projectId }) => {
    const nodes = nodeService.listNodes(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(nodes, null, 2) }] };
  });

  server.tool('get_node', '获取单个 API 节点的完整定义',
    { id: z.string().describe('节点 ID') },
    async ({ id }) => {
      const node = nodeService.getNode(id);
      if (!node) return { content: [{ type: 'text', text: `节点 ${id} 不存在` }] };
      return { content: [{ type: 'text', text: JSON.stringify(node, null, 2) }] };
    },
  );

  server.tool('create_node', '创建新的 API 节点（自定义接口定义）', {
    projectId: z.string().describe('所属项目 ID'),
    name: z.string().describe('节点名称'),
    description: z.string().optional().describe('节点描述'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).describe('HTTP 方法'),
    path: z.string().describe('请求路径'),
    group: z.string().optional().describe('分组标签'),
    remark: z.string().optional().describe('备注说明'),
  }, async ({ projectId, name, description, method, path, group, remark }) => {
    const result = nodeService.createNode({ projectId, name, description, method, path, group, remark });
    if ('error' in result) return { content: [{ type: 'text', text: `创建失败：${result.error}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('update_node', '更新 API 节点（OpenAPI 节点仅允许修改备注/分组）', {
    id: z.string().describe('节点 ID'),
    name: z.string().optional().describe('新名称'),
    description: z.string().optional().describe('新描述'),
    group: z.string().optional().describe('新分组'),
    remark: z.string().optional().describe('新备注'),
  }, async ({ id, name, description, group, remark }) => {
    const existing = nodeService.getNode(id);
    if (!existing) return { content: [{ type: 'text', text: `节点 ${id} 不存在` }] };
    if (existing.source === 'openapi' && (name !== undefined || description !== undefined)) {
      return { content: [{ type: 'text', text: 'OpenAPI 节点的 name/description/method/path/params 不可修改' }] };
    }
    const updated = nodeService.updateNode(id, { name, description, group, remark });
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  });

  server.tool('delete_node', '删除 API 节点',
    { id: z.string().describe('节点 ID') },
    async ({ id }) => {
      const ok = nodeService.deleteNode(id);
      return { content: [{ type: 'text', text: ok ? `节点 ${id} 已删除` : `节点 ${id} 不存在` }] };
    },
  );

  server.tool('archive_node', '归档隐藏 API 节点',
    { id: z.string().describe('节点 ID') },
    async ({ id }) => {
      const archived = nodeService.archiveNode(id);
      if (!archived) return { content: [{ type: 'text', text: `节点 ${id} 不存在` }] };
      return { content: [{ type: 'text', text: `节点 ${id} 已归档隐藏` }] };
    },
  );

  server.tool('unarchive_node', '取消归档，恢复 API 节点可见性',
    { id: z.string().describe('节点 ID') },
    async ({ id }) => {
      const r = nodeService.unarchiveNode(id);
      if (!r) return { content: [{ type: 'text', text: `节点 ${id} 不存在` }] };
      return { content: [{ type: 'text', text: `节点 ${id} 已恢复可见` }] };
    },
  );

  // ---- 审计日志工具 ----

  server.tool('get_audit_logs', '获取最近的审计操作日志', {
    limit: z.number().int().min(1).max(200).optional().default(50).describe('返回条数，最大 200'),
  }, async ({ limit }) => {
    const logs = await getRecentLogsAsync(limit);
    return { content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }] };
  });

  // ---- 服务发现工具 ----

  server.tool('discover_services', '发现当前所有已激活的项目级 MCP 服务节点及其路由信息',
    {},
    async () => {
      const projects = projectService.listProjects();
      const nodes: McpNodeInfo[] = projects
        .filter((p) => p.slug && p.mcpEnabled)
        .map((p) => ({
          projectId: p.id,
          projectName: p.name,
          slug: p.slug!,
          endpoint: `/api/${p.slug}/mcp`,
          toolCount: getProjectToolCount(p.id),
          online: true,
        }));
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(nodes, null, 2),
        }],
      };
    },
  );

  return server;
}

/**
 * Express 请求处理器：处理 /api/mcp 的 MCP 协议请求。
 * - 有会话 ID → 复用已有 session（标准有状态模式，Cherry Studio 等）
 * - 无会话 ID + initialize 请求 → 创建新 session
 * - 无会话 ID + 非 initialize 请求 → oneshot 兼容模式（AstrBot 等无状态客户端）
 */
export async function handleMpcRequest(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // 已存在会话 → 复用 transport
    if (sessionId && sessions.has(sessionId)) {
      const entry = sessions.get(sessionId)!;
      refreshSessionTimer(sessionId);
      await entry.transport.handleRequest(req, res, req.body);
      return;
    }

    // 新会话 → initialize 请求（标准有状态流程）
    if (!sessionId && isInitializeRequest(req.body)) {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (newSessionId) => {
          sessions.set(newSessionId, { server, transport });
          refreshSessionTimer(newSessionId);
          console.log(`[mcp] 新会话已建立: ${newSessionId}`);
        },
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // 兼容模式：无会话 ID 的非 initialize 请求（如 AstrBot 直接探测 tools/list）
    // 创建临时 oneshot server + transport，处理单次请求后立即销毁
    console.log(`[mcp] oneshot 兼容模式：${req.body?.method ?? '未知方法'}`);
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      await transport.handleRequest(req, res, req.body);
    } finally {
      // 请求完成后清理临时资源
      try { await server.close(); } catch { /* ignore */ }
      try { await transport.close(); } catch { /* ignore */ }
    }
  } catch (err) {
    console.error('[mcp] 请求处理异常:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'MCP 服务内部错误' },
        id: null,
      });
    }
  }
}
