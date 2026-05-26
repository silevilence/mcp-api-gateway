// ============================================================
// API 节点业务服务
// ============================================================
import type { ApiNode, HttpMethod, ApiParam } from '../../shared/types.js';
import * as store from './store.js';
import { createAuditLog } from './auditService.js';
import { getProject } from './projectService.js';

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
}

export interface UpdateNodeInput {
  name?: string;
  description?: string;
  method?: HttpMethod;
  path?: string;
  params?: ApiParam[];
  group?: string;
  remark?: string;
}

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
    source: 'custom',
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

  const updated: ApiNode = {
    ...existing,
    name: isOpenApiSource ? existing.name : (input.name ?? existing.name),
    description: isOpenApiSource ? existing.description : (input.description ?? existing.description),
    method: isOpenApiSource ? existing.method : (input.method ?? existing.method),
    path: isOpenApiSource ? existing.path : (input.path ?? existing.path),
    params: isOpenApiSource ? existing.params : (input.params ?? existing.params),
    group: input.group !== undefined ? input.group : existing.group,
    remark: input.remark !== undefined ? input.remark : existing.remark,
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
