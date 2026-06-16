// ============================================================
// API 节点业务服务
// ============================================================
import type { ApiNode, HttpMethod, ApiParam } from '../../shared/types.js';
import * as store from './store.js';
import { createAuditLog } from './auditService.js';
import { getProject } from './projectService.js';
import { generateSlug, validateSlug, isNodeSlugUnique } from './slugService.js';

function newId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export interface CreateNodeInput {
  projectId: string;
  name: string;
  description?: string;
  method: HttpMethod;
  path: string;
  params?: ApiParam[];
  group?: string;
  remark?: string;
  slug?: string;
}

export interface UpdateNodeInput {
  name?: string;
  description?: string;
  method?: HttpMethod;
  path?: string;
  params?: ApiParam[];
  group?: string;
  remark?: string;
  slug?: string;
  mcpToolEnabled?: boolean;
  boundModelId?: string | null;
}

export { isNodeSlugUnique, validateSlug, generateSlug };

export function listNodes(projectId?: string): ApiNode[] {
  if (projectId) {
    return store.getNodesByProjectId(projectId);
  }
  return store.getAllNodes();
}

export function getNode(id: string): ApiNode | undefined {
  return store.getNodeById(id);
}

export function createNode(input: CreateNodeInput): ApiNode | { error: string } {
  const project = getProject(input.projectId);
  if (!project) {
    return { error: `项目 ${input.projectId} 不存在` };
  }

  // 根据项目类型确定节点来源
  let source: ApiNode['source'];
  switch (project.type) {
    case 'filesystem': source = 'filesystem'; break;
    case 'vision': source = 'vision'; break;
    case 'openapi': source = 'openapi'; break;
    default: source = 'custom';
  }

  let slug = input.slug?.trim() || generateSlug(input.name) || undefined;

  const node: ApiNode = {
    id: newId(),
    projectId: input.projectId,
    name: input.name,
    description: input.description ?? '',
    method: input.method,
    path: input.path,
    params: input.params ?? [],
    hidden: false,
    group: input.group,
    remark: input.remark,
    source,
    slug,
    mcpToolEnabled: false,
    createdAt: now(),
    updatedAt: now(),
  };
  store.insertNode(node);
  createAuditLog('create', 'node', node.id, `创建 API 节点「${node.name}」(项目: ${project.name})`);
  return node;
}

export function updateNode(id: string, input: UpdateNodeInput): ApiNode | null {
  const existing = store.getNodeById(id);
  if (!existing) return null;

  // OpenAPI 来源只允许覆写 remark / group / hidden
  const isOpenApiSource = existing.source === 'openapi';

  // slug 处理
  let slug = existing.slug;
  if (input.slug !== undefined) {
    slug = input.slug.trim() || undefined;
  }

  const updated: ApiNode = {
    ...existing,
    name: isOpenApiSource ? existing.name : (input.name ?? existing.name),
    description: isOpenApiSource ? existing.description : (input.description ?? existing.description),
    method: isOpenApiSource ? existing.method : (input.method ?? existing.method),
    path: isOpenApiSource ? existing.path : (input.path ?? existing.path),
    params: isOpenApiSource ? existing.params : (input.params ?? existing.params),
    group: input.group !== undefined ? input.group : existing.group,
    remark: input.remark !== undefined ? input.remark : existing.remark,
    slug,
    mcpToolEnabled: input.mcpToolEnabled !== undefined ? input.mcpToolEnabled : existing.mcpToolEnabled,
    boundModelId: input.boundModelId !== undefined ? input.boundModelId ?? undefined : existing.boundModelId,
    updatedAt: now(),
  };
  store.updateNode(id, updated);
  createAuditLog('update', 'node', id, `更新 API 节点「${updated.name}」`);
  return updated;
}

export function deleteNode(id: string): boolean {
  const existing = store.getNodeById(id);
  if (!existing) return false;

  store.deleteNode(id);
  createAuditLog('delete', 'node', id, `删除 API 节点「${existing.name}」`);
  return true;
}

export function archiveNode(id: string): ApiNode | null {
  const existing = store.getNodeById(id);
  if (!existing) return null;

  const updated: ApiNode = { ...existing, hidden: true, updatedAt: now() };
  store.updateNode(id, updated);
  createAuditLog('archive', 'node', id, `归档 API 节点「${existing.name}」`);
  return updated;
}

export function unarchiveNode(id: string): ApiNode | null {
  const existing = store.getNodeById(id);
  if (!existing) return null;

  const updated: ApiNode = { ...existing, hidden: false, updatedAt: now() };
  store.updateNode(id, updated);
  createAuditLog('unarchive', 'node', id, `取消归档 API 节点「${existing.name}」`);
  return updated;
}

/**
 * 批量创建/更新节点（用于 OpenAPI 同步）
 * 返回新创建的节点 ID 列表
 */
export function batchUpsertNodes(nodes: ApiNode[]): string[] {
  const created: string[] = [];
  for (const node of nodes) {
    store.insertNode(node);
    created.push(node.id);
  }
  return created;
}

/** 单独更新节点 slug */
export function updateNodeSlug(
  id: string,
  slug: string,
): ApiNode | { error: string; code: number } {
  const existing = store.getNodeById(id);
  if (!existing) return { error: '节点不存在', code: 404 };

  const validation = validateSlug(slug);
  if (!validation.valid) {
    return { error: validation.error!, code: 400 };
  }

  if (!isNodeSlugUnique(existing.projectId, slug, id)) {
    return { error: '标识已被该项目下其他接口占用', code: 409 };
  }

  const result = updateNode(id, { slug });
  if (!result) return { error: '节点不存在', code: 404 };
  return result;
}

/**
 * 批量注册/取消 MCP Tool
 */
export function batchMcpRegister(
  nodeIds: string[],
  enabled: boolean,
): { registered: number; failed: Array<{ nodeId: string; reason: string }> } {
  const result = { registered: 0, failed: [] as Array<{ nodeId: string; reason: string }> };

  for (const nodeId of nodeIds) {
    const node = store.getNodeById(nodeId);
    if (!node) {
      result.failed.push({ nodeId, reason: '节点不存在' });
      continue;
    }
    if (!node.slug) {
      result.failed.push({ nodeId, reason: '节点未配置标识' });
      continue;
    }
    if (node.hidden) {
      result.failed.push({ nodeId, reason: '节点已归档隐藏' });
      continue;
    }

    const updated: ApiNode = {
      ...node,
      mcpToolEnabled: enabled,
      updatedAt: now(),
    };
    store.updateNode(nodeId, updated);
    result.registered++;
    createAuditLog(
      'update',
      'node',
      nodeId,
      `${enabled ? '注册' : '取消注册'} MCP Tool「${node.name}」`,
    );
  }

  return result;
}
