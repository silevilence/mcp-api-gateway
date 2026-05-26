// ============================================================
// API 项目集服务 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import * as projectService from '../services/projectService.js';
import * as store from '../services/store.js';

describe('项目集服务', () => {
  beforeEach(() => {
    store.clearAllData();
  });

  it('createProject 应创建自定义项目', () => {
    const p = projectService.createProject({ name: '测试项目', type: 'custom' });
    expect(p.id).toBeDefined();
    expect(p.name).toBe('测试项目');
    expect(p.type).toBe('custom');
    expect(store.getProjectById(p.id)).toBeDefined();
  });

  it('createProject 应创建 OpenAPI 项目（含 sourceUrl）', () => {
    const p = projectService.createProject({
      name: 'OpenAPI 项目',
      type: 'openapi',
      sourceUrl: 'https://example.com/openapi.json',
    });
    expect(p.type).toBe('openapi');
    expect(p.sourceUrl).toBe('https://example.com/openapi.json');
  });

  it('listProjects 应返回所有项目', () => {
    projectService.createProject({ name: 'P1', type: 'custom' });
    projectService.createProject({ name: 'P2', type: 'openapi' });
    expect(projectService.listProjects()).toHaveLength(2);
  });

  it('updateProject 应正确更新项目', () => {
    const p = projectService.createProject({ name: '旧名称', type: 'custom' });
    const updated = projectService.updateProject(p.id, { name: '新名称' });
    expect(updated?.name).toBe('新名称');
    expect(updated?.description).toBe(p.description); // 未传的字段保持原值
  });

  it('updateProject 对不存在的 ID 应返回 null', () => {
    const updated = projectService.updateProject('nonexistent', { name: 'x' });
    expect(updated).toBeNull();
  });

  it('deleteProject 应删除项目及其所有节点', () => {
    const p = projectService.createProject({ name: '待删除', type: 'custom' });
    // 手动插入一个关联节点
    store.insertNode({
      id: 'n1', projectId: p.id, name: '节点', description: '',
      method: 'GET', path: '/', params: [], hidden: false,
      source: 'custom', createdAt: '', updatedAt: '',
    });

    expect(projectService.deleteProject(p.id)).toBe(true);
    expect(projectService.getProject(p.id)).toBeUndefined();
    expect(store.getNodesByProjectId(p.id)).toHaveLength(0);
  });
});
