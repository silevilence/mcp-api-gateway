// ============================================================
// API 项目集业务服务
// ============================================================
import type { ApiProject, ProjectType } from '../../shared/types.js';
import * as store from './store.js';
import { createAuditLog } from './auditService.js';
import { generateSlug, validateSlug, isProjectSlugUnique } from './slugService.js';

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
  slug?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  sourceUrl?: string;
  localJsonPath?: string;
  slug?: string;
  mcpEnabled?: boolean;
}

export { isProjectSlugUnique, validateSlug, generateSlug };

export function listProjects(): ApiProject[] {
  return store.getAllProjects();
}

export function getProject(id: string): ApiProject | undefined {
  return store.getProjectById(id);
}

export function createProject(input: CreateProjectInput): ApiProject {
  // slug：优先使用传入值，否则从名称自动生成
  let slug = input.slug?.trim() || generateSlug(input.name) || undefined;

  const project: ApiProject = {
    id: newId(),
    name: input.name,
    description: input.description ?? '',
    type: input.type,
    sourceUrl: input.sourceUrl,
    localJsonPath: input.localJsonPath,
    slug,
    mcpEnabled: false,
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

  // slug 处理
  let slug = existing.slug;
  let mcpEnabled = existing.mcpEnabled;
  if (input.slug !== undefined) {
    slug = input.slug.trim() || undefined;
  }
  if (input.mcpEnabled !== undefined) {
    mcpEnabled = input.mcpEnabled;
  }

  // slug 变更时自动关闭 MCP
  if (slug !== existing.slug && existing.mcpEnabled) {
    mcpEnabled = false;
  }

  const updated: ApiProject = {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    sourceUrl: input.sourceUrl !== undefined ? input.sourceUrl : existing.sourceUrl,
    localJsonPath: input.localJsonPath !== undefined ? input.localJsonPath : existing.localJsonPath,
    slug,
    mcpEnabled,
    updatedAt: now(),
  };
  store.updateProject(id, updated);
  createAuditLog('update', 'project', id, `更新项目「${updated.name}」`);
  return updated;
}

/** 单独更新项目 slug */
export function updateProjectSlug(
  id: string,
  slug: string,
): ApiProject | { error: string; code: number } {
  const existing = store.getProjectById(id);
  if (!existing) return { error: '项目不存在', code: 404 };

  const validation = validateSlug(slug);
  if (!validation.valid) {
    return { error: validation.error!, code: 400 };
  }

  if (!isProjectSlugUnique(slug, id)) {
    return { error: '标识已被其他项目占用', code: 409 };
  }

  const result = updateProject(id, { slug });
  if (!result) return { error: '项目不存在', code: 404 };
  return result;
}

export function deleteProject(id: string): boolean {
  const existing = store.getProjectById(id);
  if (!existing) return false;

  store.deleteNodesByProjectId(id);
  store.deleteProject(id);
  createAuditLog('delete', 'project', id, `删除项目「${existing.name}」及其全部节点`);
  return true;
}
