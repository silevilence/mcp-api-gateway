// ============================================================
// 数据存储层 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import * as store from '../services/store.js';
import type { ApiProject, ApiNode } from '../../shared/types.js';

const makeProject = (id: string): ApiProject => ({
  id,
  name: `项目-${id}`,
  description: '',
  type: 'custom',
  slug: undefined,
  mcpEnabled: false,
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
  slug: undefined,
  mcpToolEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
});
