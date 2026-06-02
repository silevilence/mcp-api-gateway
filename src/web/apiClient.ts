// ============================================================
// API 客户端 · 封装所有 /internal 接口调用
// ============================================================
import type { ApiResponse, ApiProject, ApiNode, AuditLog, SyncDiffResult, ProjectType, HttpMethod, ApiParam } from '@shared/types.js';

interface CreateProjectInput {
  name: string;
  description?: string;
  type: ProjectType;
  sourceUrl?: string;
  localJsonPath?: string;
  workspaceRoot?: string;
}

interface UpdateProjectInput {
  name?: string;
  description?: string;
  sourceUrl?: string;
  localJsonPath?: string;
  workspaceRoot?: string;
}

interface CreateNodeInput {
  projectId: string;
  name: string;
  description?: string;
  method: HttpMethod;
  path: string;
  params?: ApiParam[];
  group?: string;
  remark?: string;
}

interface UpdateNodeInput {
  name?: string;
  description?: string;
  method?: HttpMethod;
  path?: string;
  params?: ApiParam[];
  group?: string;
  remark?: string;
}

const BASE = '/internal';

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json() as Promise<ApiResponse<T>>;
}

// ---- 项目 API ----
export const projectsApi = {
  list: () => request<ApiProject[]>(`${BASE}/projects`),
  get: (id: string) => request<ApiProject>(`${BASE}/projects/${id}`),
  create: (data: CreateProjectInput) =>
    request<ApiProject>(`${BASE}/projects`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateProjectInput) =>
    request<ApiProject>(`${BASE}/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<null>(`${BASE}/projects/${id}`, { method: 'DELETE' }),
};

// ---- 节点 API ----
export const nodesApi = {
  list: (projectId?: string) =>
    request<ApiNode[]>(`${BASE}/nodes${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
  get: (id: string) => request<ApiNode>(`${BASE}/nodes/${id}`),
  create: (data: CreateNodeInput) =>
    request<ApiNode>(`${BASE}/nodes`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateNodeInput) =>
    request<ApiNode>(`${BASE}/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<null>(`${BASE}/nodes/${id}`, { method: 'DELETE' }),
  archive: (id: string) =>
    request<ApiNode>(`${BASE}/nodes/${id}/archive`, { method: 'POST' }),
  unarchive: (id: string) =>
    request<ApiNode>(`${BASE}/nodes/${id}/unarchive`, { method: 'POST' }),
};

// ---- OpenAPI API ----
export const openapiApi = {
  parseUrl: (url: string) =>
    request<{ url: string; endpointCount: number; endpoints: unknown[] }>(`${BASE}/openapi/parse-url`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  parseJson: (jsonText: string, projectId?: string) =>
    request<{ endpointCount: number; endpoints: unknown[] }>(`${BASE}/openapi/parse-json`, {
      method: 'POST',
      body: JSON.stringify({ jsonText, projectId }),
    }),
  syncDiff: (params: { projectId: string; url?: string; jsonText?: string }) =>
    request<SyncDiffResult>(`${BASE}/openapi/sync-diff`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

// ---- 审计日志 API ----
export const auditApi = {
  list: (limit = 50) =>
    request<AuditLog[]>(`${BASE}/audit-logs?limit=${limit}`),
  rotate: () =>
    request<{ removed: number; retentionDays: number }>(`${BASE}/audit-logs/rotate`, { method: 'POST' }),
};

// ---- 健康检查 ----
export const healthApi = {
  check: () => request<{ status: string; uptime: number; timestamp: string }>(`${BASE}/health`),
};

// ---- /api 命名空间（外部接口）----
const API = '/api';

export const apiProjects = {
  updateSlug: (id: string, slug: string) =>
    request<ApiProject>(`${API}/projects/${id}/slug`, {
      method: 'PATCH',
      body: JSON.stringify({ slug }),
    }),
};

export const apiNodes = {
  updateSlug: (id: string, slug: string) =>
    request<ApiNode>(`${API}/nodes/${id}/slug`, {
      method: 'PATCH',
      body: JSON.stringify({ slug }),
    }),
  batchMcpRegister: (nodeIds: string[], enabled: boolean) =>
    request<{ registered: number; failed: Array<{ nodeId: string; reason: string }> }>(
      `${API}/nodes/batch-mcp-register`,
      { method: 'POST', body: JSON.stringify({ nodeIds, enabled }) },
    ),
};

// ---- 文件系统 API ----
export const fileSystemApi = {
  glob: (projectId: string, pattern: string, path?: string) =>
    request<import('@shared/types.js').FileSystemGlobResult>(`${API}/filesystem/glob`, {
      method: 'POST',
      body: JSON.stringify({ projectId, pattern, path }),
    }),
  ls: (projectId: string, path?: string, recursive?: boolean) =>
    request<import('@shared/types.js').FileSystemLsResult>(`${API}/filesystem/ls`, {
      method: 'POST',
      body: JSON.stringify({ projectId, path, recursive }),
    }),
  grep: (projectId: string, pattern: string, path?: string, include?: string) =>
    request<import('@shared/types.js').FileSystemGrepResult>(`${API}/filesystem/grep`, {
      method: 'POST',
      body: JSON.stringify({ projectId, pattern, path, include }),
    }),
  read: (projectId: string, file_path: string, offset?: number, limit?: number) =>
    request<import('@shared/types.js').FileSystemReadResult>(`${API}/filesystem/read`, {
      method: 'POST',
      body: JSON.stringify({ projectId, file_path, offset, limit }),
    }),
  edit: (projectId: string, file_path: string, old_string: string, new_string: string, replace_all?: boolean) =>
    request<import('@shared/types.js').FileSystemEditResult>(`${API}/filesystem/edit`, {
      method: 'POST',
      body: JSON.stringify({ projectId, file_path, old_string, new_string, replace_all }),
    }),
  write: (projectId: string, file_path: string, content: string) =>
    request<{ success: boolean }>(`${API}/filesystem/write`, {
      method: 'POST',
      body: JSON.stringify({ projectId, file_path, content }),
    }),
  delete: (projectId: string, path: string, recursive?: boolean) =>
    request<{ success: boolean }>(`${API}/filesystem/delete`, {
      method: 'POST',
      body: JSON.stringify({ projectId, path, recursive }),
    }),
};

export const sandboxApi = {
  execute: (nodeId: string, paramValues: Record<string, unknown>, baseUrlOverride?: string) =>
    request<import('@shared/types.js').SandboxResponse>(`${API}/sandbox/execute`, {
      method: 'POST',
      body: JSON.stringify({ nodeId, paramValues, baseUrlOverride }),
    }),
};
