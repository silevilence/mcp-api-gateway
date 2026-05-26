// ============================================================
// OpenAPI 解析引擎 · 单元测试
// ============================================================
import { describe, it, expect } from 'vitest';
import { parseFromJson, computeDiff, toApiNodes } from '../services/openapiParser.js';
import type { ApiNode } from '../../shared/types.js';

const sampleOpenApiJson = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        summary: '获取用户列表',
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        summary: '创建用户',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: '用户名' },
                  email: { type: 'string' },
                },
                required: ['name'],
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
  },
});

describe('OpenAPI 解析引擎', () => {
  it('parseFromJson 应正确解析端点', () => {
    const endpoints = parseFromJson(sampleOpenApiJson);
    expect(endpoints).toHaveLength(2);

    const getEp = endpoints.find((e) => e.method === 'GET');
    expect(getEp).toBeDefined();
    expect(getEp?.path).toBe('/users');
    expect(getEp?.parameters).toHaveLength(1);
    expect(getEp?.parameters[0].name).toBe('page');

    const postEp = endpoints.find((e) => e.method === 'POST');
    expect(postEp).toBeDefined();
    expect(postEp?.parameters).toHaveLength(2); // name + email from body
  });

  it('parseFromJson 对无效 JSON 应抛出错误', () => {
    expect(() => parseFromJson('not json')).toThrow('JSON 解析失败');
  });

  it('toApiNodes 应将端点转为 ApiNode', () => {
    const endpoints = parseFromJson(sampleOpenApiJson);
    const nodes = toApiNodes(endpoints, 'p1');
    expect(nodes).toHaveLength(2);
    expect(nodes[0].projectId).toBe('p1');
    expect(nodes[0].source).toBe('openapi');
  });

  it('computeDiff 应正确识别新增/删除/修改', () => {
    // 已有节点
    const existing: ApiNode[] = [
      {
        id: 'n1', projectId: 'p1', name: '获取用户', description: '',
        method: 'GET', path: '/users', params: [], hidden: false,
        source: 'openapi', createdAt: '', updatedAt: '',
      },
    ];

    // 新解析的端点 (模拟修改了 /users 的描述，新增了 POST)
    const endpoints = parseFromJson(sampleOpenApiJson);
    const diff = computeDiff(existing, endpoints);

    // 新增：POST /users
    expect(diff.added.length).toBeGreaterThanOrEqual(1);
    expect(diff.added.some((n) => n.method === 'POST')).toBe(true);

    // 修改：GET /users (params 变了)
    const modified = diff.modified.find((m) => m.before.method === 'GET');
    expect(modified).toBeDefined();
  });

  it('computeDiff 空数据时应全量新增', () => {
    const endpoints = parseFromJson(sampleOpenApiJson);
    const diff = computeDiff([], endpoints);
    expect(diff.added).toHaveLength(2);
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
  });
});
