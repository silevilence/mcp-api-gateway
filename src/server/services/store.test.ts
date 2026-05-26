// ============================================================
// 数据存储层 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import * as store from '../services/store.js';
import type { ApiProject, ApiNode, AuditLog } from '../../shared/types.js';

const makeProject = (id: string): ApiProject => ({
  id,
  name: `项目-${id}`,
  description: '',
  type: 'custom',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeNode = (id: string, projectId: string): ApiNode => ({
  id,
  projectId,
  name: `节点-${id}`,
  description: '',
  method: 'GET',
  path: '/test',
  params: [],
  hidden: false,
  source: 'custom',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeLog = (id: string): AuditLog => ({
  id,
  action: 'create',
  targetType: 'project',
  targetId: 'p1',
  detail: 'test',
  timestamp: new Date().toISOString(),
});

describe('内存数据存储', () => {
  beforeEach(() => {
    store.clearAllData();
  });

  it('应正确增删查项目', () => {
    const p = makeProject('p1');
    store.insertProject(p);
    expect(store.getProjectById('p1')).toEqual(p);
    expect(store.getAllProjects()).toHaveLength(1);

    store.deleteProject('p1');
    expect(store.getProjectById('p1')).toBeUndefined();
  });

  it('应正确增删查节点并按项目筛选', () => {
    store.insertNode(makeNode('n1', 'p1'));
    store.insertNode(makeNode('n2', 'p1'));
    store.insertNode(makeNode('n3', 'p2'));

    expect(store.getAllNodes()).toHaveLength(3);
    expect(store.getNodesByProjectId('p1')).toHaveLength(2);
    expect(store.getNodesByProjectId('p2')).toHaveLength(1);

    store.deleteNode('n1');
    expect(store.getNodeById('n1')).toBeUndefined();
  });

  it('deleteNodesByProjectId 应删除项目下所有节点', () => {
    store.insertNode(makeNode('n1', 'p1'));
    store.insertNode(makeNode('n2', 'p1'));
    store.insertNode(makeNode('n3', 'p2'));

    store.deleteNodesByProjectId('p1');
    expect(store.getAllNodes()).toHaveLength(1);
    expect(store.getNodeById('n3')).toBeDefined();
  });

  it('审计日志追加与倒序查询', () => {
    store.appendAuditLog(makeLog('log1'));
    store.appendAuditLog(makeLog('log2'));
    store.appendAuditLog(makeLog('log3'));

    const logs = store.getAuditLogs(2);
    expect(logs).toHaveLength(2);
    // 倒序排列
    expect(logs[0].id).toBe('log3');
  });

  it('removeAuditLogsOlderThan 应正确清理过期日志', () => {
    const oldLog: AuditLog = {
      ...makeLog('old'),
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const newLog: AuditLog = {
      ...makeLog('new'),
      timestamp: new Date().toISOString(),
    };

    store.appendAuditLog(oldLog);
    store.appendAuditLog(newLog);

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const removed = store.removeAuditLogsOlderThan(cutoff);
    expect(removed).toBe(1);

    const remaining = store.getAuditLogs(10);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('new');
  });
});
