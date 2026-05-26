// ============================================================
// mcp-api-gateway · 前后端共享接口契约与类型定义
// ============================================================

// ---- API 统一响应信封 ----
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// ---- API 项目集 (策略容器) ----
export interface ApiProject {
  id: string;
  name: string;
  description: string;
  /** 项目类型：custom = 自定义接口, openapi = OpenAPI 托管 */
  type: ProjectType;
  /** OpenAPI 远程 URL（openapi 类型专用） */
  sourceUrl?: string;
  /** OpenAPI 本地 JSON 文档路径 */
  localJsonPath?: string;
  /** 项目唯一标识 (slug)，全局唯一，正则: [a-zA-Z0-9_-]+，1-64 字符 */
  slug?: string;
  /** MCP Server 是否已启用（需先配置 slug），默认 false */
  mcpEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProjectType = 'custom' | 'openapi';

// ---- API 节点 ----
export interface ApiNode {
  id: string;
  projectId: string;
  name: string;
  description: string;
  /** HTTP 方法 */
  method: HttpMethod;
  /** 请求路径 */
  path: string;
  /** 输入参数定义 */
  params: ApiParam[];
  /** 是否归档隐藏 */
  hidden: boolean;
  /** 分组标签 */
  group?: string;
  /** 备注（OpenAPI 类型下允许覆写的附加属性） */
  remark?: string;
  /** 节点来源 */
  source: NodeSource;
  /** 接口唯一标识 (slug)，项目作用域内唯一，正则: [a-zA-Z0-9_-]+，1-64 字符 */
  slug?: string;
  /** 是否注册为 MCP Tool，默认 false */
  mcpToolEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiParam {
  key: string;
  type: ParamType;
  required: boolean;
  description?: string;
  /** 参数位置 */
  location: ParamLocation;
  defaultValue?: unknown;
}

export type ParamType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'object' | 'array';
export type ParamLocation = 'query' | 'path' | 'body' | 'formData';

export type NodeSource = 'custom' | 'openapi';

// ---- 操作审计日志 ----
export interface AuditLog {
  id: string;
  action: AuditAction;
  targetType: 'project' | 'node';
  targetId: string;
  detail: string;
  timestamp: string;
}

export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'unarchive' | 'sync';

// ---- 沙箱调试 ----
export interface SandboxRequest {
  nodeId: string;
  paramValues: Record<string, unknown>;
  baseUrlOverride?: string;
}

export interface SandboxResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  responseTimeMs: number;
  contentType: string;
}

// ---- MCP 服务发现 ----
export interface McpNodeInfo {
  projectId: string;
  projectName: string;
  slug: string;
  endpoint: string;
  toolCount: number;
  /** 是否在线：当前所有已激活的项目级 MCP 均在同一进程内，恒等于 mcpEnabled */
  online: boolean;
}

// ---- OpenAPI 同步 Diff 结果 ----
export interface SyncDiffResult {
  added: ApiNode[];
  removed: ApiNode[];
  modified: Array<{
    before: ApiNode;
    after: ApiNode;
    changes: string[];
  }>;
}
