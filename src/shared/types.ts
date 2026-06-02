// ============================================================
// mcp-api-gateway · 前后端共享接口契约与类型定义
// ============================================================

// ---- 文件系统能力元数据常量 ----
export const FILE_SYSTEM_CAPABILITIES: FileSystemCapabilityMeta[] = [
  {
    id: 'glob',
    name: 'Glob 模式匹配',
    description: '跨规模代码库的文件模式匹配引擎。支持标准 Glob 语法，按修改时间倒序返回绝对路径。',
    danger: false,
    params: [
      { key: 'pattern', type: 'string', required: true, description: '匹配模式，用于定位目标文件，如 **/*.ts' },
      { key: 'path', type: 'string', required: false, description: '检索起始绝对路径，缺省值为工作区根目录' },
    ],
  },
  {
    id: 'ls',
    name: '目录结构拓扑检索',
    description: '指定路径的层级结构平铺与检索。返回树状拓扑并标注类型。',
    danger: false,
    params: [
      { key: 'path', type: 'string', required: false, description: '检索目标绝对路径，缺省值为工作区根目录' },
      { key: 'recursive', type: 'boolean', required: false, description: '是否开启递归检索（默认：false）' },
    ],
  },
  {
    id: 'grep',
    name: '正则内容检索',
    description: '基于正则表达式的全量内容检索工具。支持标准正则语法及文件类型过滤。',
    danger: false,
    params: [
      { key: 'pattern', type: 'string', required: true, description: '用于匹配文件内容的正则表达式' },
      { key: 'path', type: 'string', required: false, description: '检索起始绝对路径，缺省值为工作区根目录' },
      { key: 'include', type: 'string', required: false, description: '文件范围过滤器，如 *.{ts,tsx}' },
    ],
  },
  {
    id: 'read',
    name: '安全文件读取',
    description: '受控的工作区文件内容读取。支持大文件分页加载与行超长截断保护。',
    danger: false,
    params: [
      { key: 'file_path', type: 'string', required: true, description: '目标文件绝对路径' },
      { key: 'offset', type: 'number', required: false, description: '起始行号（从 1 开始计）' },
      { key: 'limit', type: 'number', required: false, description: '读取行数上限（默认 2000 行）' },
    ],
  },
  {
    id: 'edit',
    name: '原子级内容替换',
    description: '基于精确字符串匹配的内容补丁工具。支持缩进保留及多点替换。',
    danger: true,
    params: [
      { key: 'file_path', type: 'string', required: true, description: '目标文件绝对路径' },
      { key: 'old_string', type: 'string', required: true, description: '待替换的原始文本（精确匹配）' },
      { key: 'new_string', type: 'string', required: true, description: '目标替换文本' },
      { key: 'replace_all', type: 'boolean', required: false, description: '是否执行全局替换（默认：false）' },
    ],
  },
  {
    id: 'write',
    name: '全量内容覆盖',
    description: '资源全量写入与初始化。支持父级目录自动递归创建。',
    danger: true,
    params: [
      { key: 'file_path', type: 'string', required: true, description: '目标文件绝对路径' },
      { key: 'content', type: 'string', required: true, description: '写入的全量文本内容' },
    ],
  },
  {
    id: 'delete',
    name: '级联资源销毁',
    description: '文件或目录的物理删除操作。注意：操作具备不可逆性。',
    danger: true,
    params: [
      { key: 'path', type: 'string', required: true, description: '待删除的文件或目录绝对路径' },
      { key: 'recursive', type: 'boolean', required: false, description: '针对目录是否执行递归删除（默认：false）' },
    ],
  },
];

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
  /** 文件系统工作区根目录（filesystem 类型专用） */
  workspaceRoot?: string;
  /** 项目唯一标识 (slug)，全局唯一，正则: [a-zA-Z0-9_-]+，1-64 字符 */
  slug?: string;
  /** MCP Server 是否已启用（需先配置 slug），默认 false */
  mcpEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProjectType = 'custom' | 'openapi' | 'filesystem';

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

export type NodeSource = 'custom' | 'openapi' | 'filesystem';

// ---- 文件系统能力枚举 ----
export type FileSystemCapability =
  | 'glob'
  | 'ls'
  | 'grep'
  | 'read'
  | 'edit'
  | 'write'
  | 'delete';

/** 文件系统能力元数据 */
export interface FileSystemCapabilityMeta {
  id: FileSystemCapability;
  name: string;
  description: string;
  danger: boolean; // 高危操作需要二次确认
  params: FileSystemParam[];
}

export interface FileSystemParam {
  key: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

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

// ---- 文件系统操作结果 ----
export interface FileSystemGlobResult {
  files: string[];
  totalCount: number;
  truncated: boolean;
}

export interface FileSystemLsEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size?: number;
  modifiedAt?: string;
}

export interface FileSystemLsResult {
  entries: FileSystemLsEntry[];
  totalCount: number;
  truncated: boolean;
}

export interface FileSystemGrepMatch {
  file: string;
  line: number;
  content: string;
}

export interface FileSystemGrepResult {
  matches: FileSystemGrepMatch[];
  totalCount: number;
  truncated: boolean;
}

export interface FileSystemReadResult {
  lines: string[];
  totalLines: number;
  startLine: number;
  truncated: boolean;
}

export interface FileSystemEditResult {
  success: boolean;
  replacedCount: number;
  message?: string;
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

/** 从文件系统能力元数据生成 ApiNode 模板（用于预设节点） */
export function createFileSystemNodeTemplate(
  cap: FileSystemCapabilityMeta,
  projectId: string,
): Omit<ApiNode, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId,
    name: cap.name,
    description: cap.description,
    method: 'POST',
    path: `/api/filesystem/${cap.id}`,
    params: cap.params.map((p) => ({
      key: p.key,
      type: p.type === 'number' ? 'number' : 'string' as ParamType,
      required: p.required,
      description: p.description,
      location: 'body' as ParamLocation,
    })),
    hidden: false,
    group: '文件系统',
    source: 'filesystem',
    slug: cap.id,
    mcpToolEnabled: true,
  };
}
