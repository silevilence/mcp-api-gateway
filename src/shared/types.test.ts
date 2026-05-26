// ============================================================
// 共享类型 · 结构校验测试
// ============================================================
import { describe, it, expect } from 'vitest';
import type { ApiResponse, ApiProject, ApiNode } from './types.js';

describe('共享类型契约', () => {
  it('ApiResponse<T> 应具备 code / message / data 字段', () => {
    const resp: ApiResponse<string> = {
      code: 0,
      message: 'ok',
      data: 'test',
    };
    expect(resp.code).toBe(0);
    expect(resp.message).toBe('ok');
    expect(resp.data).toBe('test');
  });

  it('ApiProject 应支持 custom 和 openapi 两种类型', () => {
    const customProject: ApiProject = {
      id: 'p1',
      name: '自定义项目',
      description: '',
      type: 'custom',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(customProject.type).toBe('custom');

    const openapiProject: ApiProject = {
      id: 'p2',
      name: 'OpenAPI 项目',
      description: '',
      type: 'openapi',
      sourceUrl: 'https://api.example.com/openapi.json',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(openapiProject.type).toBe('openapi');
    expect(openapiProject.sourceUrl).toBeDefined();
  });

  it('ApiNode 应正确关联 projectId 并支持所有 HTTP 方法', () => {
    const node: ApiNode = {
      id: 'n1',
      projectId: 'p1',
      name: '获取用户列表',
      description: '',
      method: 'GET',
      path: '/users',
      params: [
        { key: 'page', type: 'integer', required: false, location: 'query' },
      ],
      hidden: false,
      source: 'custom',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(node.method).toBe('GET');
    expect(node.params).toHaveLength(1);
    expect(node.params[0].location).toBe('query');
  });
});
