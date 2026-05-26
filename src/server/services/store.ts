// ============================================================
// 内存数据存储层 · 提供统一的数据读写接口
// 集成持久化：写操作后自动触发 debounce 刷盘
// ============================================================
import type { ApiProject, ApiNode } from '../../shared/types.js';
import {
  initStore as persistenceInit,
  scheduleFlush,
  bindStoreReaders,
} from './persistence.js';

/** 项目存储 */
const projects = new Map<string, ApiProject>();

/** 节点存储 */
const nodes = new Map<string, ApiNode>();

// ---- 持久化绑定 ----
bindStoreReaders(
  () => ({
    projects: Array.from(projects.values()),
    nodes: Array.from(nodes.values()),
  }),
  (loadedProjects, loadedNodes) => {
    for (const p of loadedProjects) projects.set(p.id, p);
    for (const n of loadedNodes) nodes.set(n.id, n);
  },
);

/** 初始化：从磁盘加载数据 */
export async function init(): Promise<void> {
  await persistenceInit();
}

// ---- Project Store ----

export function getAllProjects(): ApiProject[] {
  return Array.from(projects.values());
}

export function getProjectById(id: string): ApiProject | undefined {
  return projects.get(id);
}

export function insertProject(project: ApiProject): void {
  projects.set(project.id, project);
  scheduleFlush();
}

export function updateProject(id: string, project: ApiProject): boolean {
  if (!projects.has(id)) return false;
  projects.set(id, project);
  scheduleFlush();
  return true;
}

export function deleteProject(id: string): boolean {
  const result = projects.delete(id);
  if (result) scheduleFlush();
  return result;
}

// ---- Node Store ----

export function getAllNodes(): ApiNode[] {
  return Array.from(nodes.values());
}

export function getNodeById(id: string): ApiNode | undefined {
  return nodes.get(id);
}

export function getNodesByProjectId(projectId: string): ApiNode[] {
  return Array.from(nodes.values()).filter((n) => n.projectId === projectId);
}

export function insertNode(node: ApiNode): void {
  nodes.set(node.id, node);
  scheduleFlush();
}

export function updateNode(id: string, node: ApiNode): boolean {
  if (!nodes.has(id)) return false;
  nodes.set(id, node);
  scheduleFlush();
  return true;
}

export function deleteNode(id: string): boolean {
  const result = nodes.delete(id);
  if (result) scheduleFlush();
  return result;
}

export function deleteNodesByProjectId(projectId: string): void {
  let changed = false;
  for (const [id, node] of nodes) {
    if (node.projectId === projectId) {
      nodes.delete(id);
      changed = true;
    }
  }
  if (changed) scheduleFlush();
}

// ---- 测试/重置 ----

export function clearAllData(): void {
  projects.clear();
  nodes.clear();
}
