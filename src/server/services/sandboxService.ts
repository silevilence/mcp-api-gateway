// ============================================================
// API 在线调试沙箱 · HTTP 请求引擎
// 供前端沙箱面板和项目级 MCP Tool 执行链路复用
// ============================================================
import type { SandboxResponse, ApiNode, ApiParam } from '../../shared/types.js';
import { getNode } from './nodeService.js';
import { getProject } from './projectService.js';
import * as fsService from './fileSystemService.js';

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * 执行沙箱请求（HTTP 或文件系统能力）
 * @param nodeId    API 节点 ID
 * @param paramValues  参数值映射 (key → value)
 * @param baseUrlOverride  覆盖 base URL（默认从节点 path 推断或使用 override）
 */
export async function execute(
  nodeId: string,
  paramValues: Record<string, unknown>,
  baseUrlOverride?: string,
): Promise<SandboxResponse> {
  const node = getNode(nodeId);
  if (!node) {
    throw new SandboxError('节点不存在', 404);
  }

  const project = getProject(node.projectId);
  if (!project) {
    throw new SandboxError('关联项目不存在', 404);
  }

  // ---- 文件系统能力执行路径 ----
  if (node.source === 'filesystem') {
    return executeFileSystemCapability(node, paramValues, project.workspaceRoot);
  }

  // 构建 URL
  const url = buildUrl(node, paramValues, baseUrlOverride);

  // 构建 headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 构建 body
  const body = buildBody(node.params, paramValues);

  // 发起请求
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: node.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Math.round(performance.now() - startTime);
    const contentType = response.headers.get('content-type') ?? 'text/plain';
    const responseBody = await response.text();

    // 收集响应头
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      responseTimeMs,
      contentType,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        statusCode: 408,
        headers: {},
        body: JSON.stringify({ error: '请求超时', timeout: DEFAULT_TIMEOUT_MS }),
        responseTimeMs: Math.round(performance.now() - startTime),
        contentType: 'application/json',
      };
    }

    const message = err instanceof Error ? err.message : '未知网络错误';
    // 分类错误
    let statusCode = 502;
    let body = JSON.stringify({ error: message });
    if (message.includes('ENOTFOUND') || message.includes('DNS')) {
      body = JSON.stringify({ error: 'DNS 解析失败', detail: message });
    } else if (message.includes('ECONNREFUSED')) {
      body = JSON.stringify({ error: '连接被拒绝', detail: message });
    } else if (message.includes('SSL') || message.includes('certificate')) {
      body = JSON.stringify({ error: 'SSL/TLS 证书错误', detail: message });
    }

    return {
      statusCode,
      headers: {},
      body,
      responseTimeMs: Math.round(performance.now() - startTime),
      contentType: 'application/json',
    };
  }
}

/** 构建完整 URL */
function buildUrl(
  node: ApiNode,
  paramValues: Record<string, unknown>,
  baseUrlOverride?: string,
): string {
  let url = node.path;

  // 如果 path 已是完整 URL，直接使用
  if (/^https?:\/\//i.test(url)) {
    // 替换路径参数 {param} 为实际值
    for (const [key, value] of Object.entries(paramValues)) {
      const param = node.params.find((p) => p.key === key && p.location === 'path');
      if (param) {
        url = url.replace(`{${key}}`, encodeURIComponent(String(value ?? '')));
      }
    }
    // 拼接 query 参数
    const queryParams = buildQueryString(node.params, paramValues);
    if (queryParams) {
      url += (url.includes('?') ? '&' : '?') + queryParams;
    }
    return url;
  }

  // 相对路径：拼接 baseUrl
  const base = baseUrlOverride?.replace(/\/+$/, '') ?? 'http://localhost';
  let fullUrl = base + (url.startsWith('/') ? url : '/' + url);

  // 替换路径参数
  for (const [key, value] of Object.entries(paramValues)) {
    const param = node.params.find((p) => p.key === key && p.location === 'path');
    if (param) {
      fullUrl = fullUrl.replace(`{${key}}`, encodeURIComponent(String(value ?? '')));
    }
  }

  // 拼接 query 参数
  const queryParams = buildQueryString(node.params, paramValues);
  if (queryParams) {
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryParams;
  }

  return fullUrl;
}

/** 构建 query string */
function buildQueryString(
  params: ApiParam[],
  paramValues: Record<string, unknown>,
): string {
  const parts: string[] = [];
  for (const param of params) {
    if (param.location !== 'query') continue;
    const value = paramValues[param.key];
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(param.key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.join('&');
}

/** 构建请求 body */
function buildBody(
  params: ApiParam[],
  paramValues: Record<string, unknown>,
): string | undefined {
  const bodyParams = params.filter((p) => p.location === 'body');
  if (bodyParams.length === 0) return undefined;

  // 尝试从 paramValues 中取名为 'body' 的原始 JSON
  if (typeof paramValues['body'] === 'string') {
    return paramValues['body'] as string;
  }

  // 否则按 key-value 组装 JSON
  const body: Record<string, unknown> = {};
  for (const param of bodyParams) {
    const value = paramValues[param.key];
    if (value !== undefined) {
      body[param.key] = value;
    }
  }
  return JSON.stringify(body);
}

// ---- 文件系统能力执行调度 ----

/** 根据节点 params 元信息对 paramValues 做类型转换（前端表单提交的值全是 string） */
function coerceParams(
  node: ApiNode,
  paramValues: Record<string, unknown>,
): Record<string, unknown> {
  const coerced: Record<string, unknown> = { ...paramValues };
  for (const p of node.params) {
    const raw = coerced[p.key];
    if (raw === undefined || raw === null || raw === '') {
      coerced[p.key] = undefined;
      continue;
    }
    switch (p.type) {
      case 'number':
      case 'integer':
        coerced[p.key] = Number(raw);
        break;
      case 'boolean':
        coerced[p.key] = raw === true || raw === 'true' || raw === 1 || raw === '1';
        break;
      default:
        coerced[p.key] = String(raw);
    }
  }
  return coerced;
}

/** 根据节点 slug（即能力 id）派发到对应文件系统服务函数 */
async function executeFileSystemCapability(
  node: ApiNode,
  paramValues: Record<string, unknown>,
  workspaceRoot?: string,
): Promise<SandboxResponse> {
  const root = workspaceRoot || process.cwd();
  const startTime = performance.now();
  const args = coerceParams(node, paramValues);

  try {
    let result: unknown;

    switch (node.slug) {
      case 'glob':
        result = await fsService.glob(
          args['pattern'] as string,
          args['path'] as string | undefined,
          root,
        );
        break;
      case 'ls':
        result = fsService.ls(
          args['path'] as string | undefined,
          args['recursive'] as boolean,
          root,
        );
        break;
      case 'grep':
        result = await fsService.grep(
          args['pattern'] as string,
          args['path'] as string | undefined,
          args['include'] as string | undefined,
          root,
        );
        break;
      case 'read':
        result = await fsService.read(
          args['file_path'] as string,
          args['offset'] as number | undefined,
          args['limit'] as number | undefined,
          root,
        );
        break;
      case 'edit':
        result = await fsService.edit(
          args['file_path'] as string,
          args['old_string'] as string,
          args['new_string'] as string,
          args['replace_all'] as boolean,
          root,
        );
        break;
      case 'write':
        result = await fsService.write(
          args['file_path'] as string,
          args['content'] as string,
          root,
        );
        break;
      case 'delete':
        result = await fsService.deletePath(
          args['path'] as string,
          args['recursive'] as boolean,
          root,
        );
        break;
      default:
        throw new SandboxError(`未知的文件系统能力: ${node.slug}`, 400);
    }

    const responseTimeMs = Math.round(performance.now() - startTime);
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(result, null, 2),
      responseTimeMs,
      contentType: 'application/json',
    };
  } catch (err: unknown) {
    const responseTimeMs = Math.round(performance.now() - startTime);
    const message = err instanceof SandboxError ? err.message :
      err instanceof Error ? err.message : '文件系统操作失败';
    const statusCode = err instanceof SandboxError ? err.code : 500;

    return {
      statusCode,
      headers: {},
      body: JSON.stringify({ error: message }),
      responseTimeMs,
      contentType: 'application/json',
    };
  }
}

// ---- 错误类 ----
export class SandboxError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'SandboxError';
    this.code = code;
  }
}
