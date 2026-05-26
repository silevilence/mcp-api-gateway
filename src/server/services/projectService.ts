// ============================================================
// API 项目集业务服务
// ============================================================
import type { ApiProject, ProjectType } from '../../shared/types.js';
import * as store from './store.js';
import { createAuditLog } from './auditService.js';

function newId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  type: ProjectType;
  sourceUrl?: string;
  localJsonPath?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  sourceUrl?: string;
  localJsonPath?: string;
}

export function listProjects(): ApiProject[] {
  return store.getAllProjects();
}

export function getProject(id: string): ApiProject | undefined {
  return store.getProjectById(id);
}

export function createProject(input: CreateProjectInput): ApiProject {
  const project: ApiProject = {
    id: newId(),
    name: input.name,
    description: input.description ?? '',
    type: input.type,
    sourceUrl: input.sourceUrl,
    localJsonPath: input.localJsonPath,
    createdAt: now(),
    updatedAt: now(),
  };
  store.insertProject(project);
  createAuditLog('create', 'project', project.id, `创建项目「${project.name}」`);
  return project;
}

export function updateProject(id: string, input: UpdateProjectInput): ApiProject | null {
  const existing = store.getProjectById(id);
  if (!existing) return null;

  const updated: ApiProject = {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    sourceUrl: input.sourceUrl !== undefined ? input.sourceUrl : existing.sourceUrl,
    localJsonPath: input.localJsonPath !== undefined ? input.localJsonPath : existing.localJsonPath,
    updatedAt: now(),
  };
  store.updateProject(id, updated);
  createAuditLog('update', 'project', id, `更新项目「${updated.name}」`);
  return updated;
}

export function deleteProject(id: string): boolean {
  const existing = store.getProjectById(id);
  if (!existing) return false;

  store.deleteNodesByProjectId(id);
  store.deleteProject(id);
  createAuditLog('delete', 'project', id, `删除项目「${existing.name}」及其全部节点`);
  return true;
}
