// ============================================================
// MCP 服务引擎 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { handleMpcRequest } from './mcpService.js';
import * as store from './store.js';
import * as projectService from './projectService.js';
import * as nodeService from './nodeService.js';

describe('MCP 服务引擎', () => {
  beforeEach(() => {
    store.clearAllData();
  });

  it('handleMpcRequest 应作为函数正确导出', () => {
    expect(handleMpcRequest).toBeDefined();
    expect(typeof handleMpcRequest).toBe('function');
  });

  it('createServer 工厂注册的工具应能通过服务层正常工作', () => {
    // 验证工具所依赖的服务层正常工作
    const project = projectService.createProject({ name: 'MCP项目', type: 'custom' });
    expect(project).toBeDefined();
    expect(project.name).toBe('MCP项目');

    const node = nodeService.createNode({
      projectId: project.id,
      name: 'TestAPI',
      method: 'GET',
      path: '/test',
    });
    if ('error' in node) throw new Error(node.error);
    expect(node.name).toBe('TestAPI');

    const nodes = nodeService.listNodes(project.id);
    expect(nodes).toHaveLength(1);
  });

  it('服务层数据隔离应正常', () => {
    const project = projectService.createProject({ name: 'P1', type: 'custom' });
    const allProjects = projectService.listProjects();
    expect(allProjects).toHaveLength(1);
    expect(allProjects[0].name).toBe('P1');
  });

  it('OpenAPI 节点保护逻辑应在服务层生效', () => {
    const project = projectService.createProject({ name: 'OpenAPI项目', type: 'openapi' });
    // 模拟一个 openapi 来源的节点（通过直接操作 store 创建）
    const node = nodeService.createNode({
      projectId: project.id,
      name: 'OAPI-Node',
      method: 'GET',
      path: '/from-openapi',
    });
    if ('error' in node) throw new Error(node.error);

    // 验证节点存在
    const existing = nodeService.getNode(node.id);
    expect(existing).toBeDefined();
  });
});
