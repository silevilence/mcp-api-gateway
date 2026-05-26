// ============================================================
// API 节点服务 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import * as nodeService from '../services/nodeService.js';
import * as projectService from '../services/projectService.js';
import * as store from '../services/store.js';

describe('节点服务', () => {
  let projectId: string;

  beforeEach(() => {
    store.clearAllData();
    const p = projectService.createProject({ name: '测试项目', type: 'custom' });
    projectId = p.id;
  });

  it('createNode 应创建节点', () => {
    const result = nodeService.createNode({
      projectId,
      name: '获取用户',
      method: 'GET',
      path: '/users',
    });

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.name).toBe('获取用户');
      expect(result.method).toBe('GET');
      expect(result.projectId).toBe(projectId);
      expect(result.source).toBe('custom');
    }
  });

  it('createNode 对不存在的项目应返回 error', () => {
    const result = nodeService.createNode({
      projectId: 'nonexistent',
      name: 'x',
      method: 'GET',
      path: '/',
    });
    expect('error' in result).toBe(true);
  });

  it('listNodes 应按项目筛选', () => {
    nodeService.createNode({ projectId, name: 'N1', method: 'GET', path: '/a' });
    nodeService.createNode({ projectId, name: 'N2', method: 'POST', path: '/b' });

    const p2 = projectService.createProject({ name: 'P2', type: 'custom' });
    nodeService.createNode({ projectId: p2.id, name: 'N3', method: 'GET', path: '/c' });

    expect(nodeService.listNodes(projectId)).toHaveLength(2);
    expect(nodeService.listNodes()).toHaveLength(3);
  });

  it('updateNode 应对 OpenAPI 源节点限制字段修改', () => {
    // 模拟一个 OpenAPI 源节点
    const openapiNode = {
      id: 'openapi-n1', projectId, name: 'OpenAPI 端点', description: '',
      method: 'GET' as const, path: '/openapi', params: [],
      hidden: false, source: 'openapi' as const,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    store.insertNode(openapiNode);

    const updated = nodeService.updateNode('openapi-n1', {
      name: '被修改的名称',
      method: 'POST',
      remark: '新增备注',
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('OpenAPI 端点'); // 不可修改
    expect(updated?.method).toBe('GET');        // 不可修改
    expect(updated?.remark).toBe('新增备注');    // 可修改
  });

  it('archiveNode / unarchiveNode 应切换隐藏状态', () => {
    const result = nodeService.createNode({ projectId, name: 'N', method: 'GET', path: '/' });
    if ('error' in result) throw new Error('创建失败');

    const archived = nodeService.archiveNode(result.id);
    expect(archived?.hidden).toBe(true);

    const unarchived = nodeService.unarchiveNode(result.id);
    expect(unarchived?.hidden).toBe(false);
  });

  it('deleteNode 应删除节点', () => {
    const result = nodeService.createNode({ projectId, name: 'N', method: 'GET', path: '/' });
    if ('error' in result) throw new Error('创建失败');

    expect(nodeService.deleteNode(result.id)).toBe(true);
    expect(nodeService.getNode(result.id)).toBeUndefined();
  });
});
