// ============================================================
// 内存数据存储层 · 提供统一的数据读写接口
// ============================================================
import type { ApiProject, ApiNode, AuditLog } from '../../shared/types.js';

/** 项目存储 */
const projects = new Map<string, ApiProject>();

/** 节点存储 */
const nodes = new Map<string, ApiNode>();

/** 审计日志存储 */
const auditLogs: AuditLog[] = [];

// ---- Project Store ----

export function getAllProjects(): ApiProject[] {
  return Array.from(projects.values());
}

export function getProjectById(id: string): ApiProject | undefined {
  return projects.get(id);
}

export function insertProject(project: ApiProject): void {
  projects.set(project.id, project);
}

export function updateProject(id: string, project: ApiProject): boolean {
  if (!projects.has(id)) return false;
  projects.set(id, project);
  return true;
}

export function deleteProject(id: string): boolean {
  return projects.delete(id);
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
}

export function updateNode(id: string, node: ApiNode): boolean {
  if (!nodes.has(id)) return false;
  nodes.set(id, node);
  return true;
}

export function deleteNode(id: string): boolean {
  return nodes.delete(id);
}

export function deleteNodesByProjectId(projectId: string): void {
  for (const [id, node] of nodes) {
    if (node.projectId === projectId) {
      nodes.delete(id);
    }
  }
}

// ---- Audit Log Store ----

export function appendAuditLog(log: AuditLog): void {
  auditLogs.push(log);
}

export function getAuditLogs(limit = 50): AuditLog[] {
  return auditLogs.slice(-limit).reverse();
}

export function removeAuditLogsOlderThan(cutoff: string): number {
  const before = auditLogs.length;
  const filtered = auditLogs.filter((log) => log.timestamp >= cutoff);
  auditLogs.length = 0;
  auditLogs.push(...filtered);
  return before - auditLogs.length;
}

export function clearAllData(): void {
  projects.clear();
  nodes.clear();
  auditLogs.length = 0;
}
