// ============================================================
// 共享类型 · 结构校验测试
// ============================================================
import { describe, it, expect } from 'vitest';
import { VISION_CAPABILITIES, type VisionCapability } from './types.js';
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

describe('VISION_CAPABILITIES', () => {
  const expectedIds: VisionCapability[] = [
    'ui_to_artifact',
    'ocr',
    'ui_diff_check',
    'image_analysis',
    'video_analysis',
  ];

  it('应包含全部 5 个视觉原子能力', () => {
    expect(VISION_CAPABILITIES).toHaveLength(5);
    const ids = VISION_CAPABILITIES.map((c) => c.id);
    expect(ids.sort()).toEqual([...expectedIds].sort());
  });

  it('每个 capability 应有完整的元数据字段', () => {
    for (const cap of VISION_CAPABILITIES) {
      expect(cap).toHaveProperty('id');
      expect(cap).toHaveProperty('name');
      expect(cap).toHaveProperty('description');
      expect(cap).toHaveProperty('danger');
      expect(cap).toHaveProperty('params');
      expect(Array.isArray(cap.params)).toBe(true);
      expect(cap.params.length).toBeGreaterThan(0);
    }
  });

  it('每个 param 应有 key/type/required/description', () => {
    for (const cap of VISION_CAPABILITIES) {
      for (const param of cap.params) {
        expect(param).toHaveProperty('key');
        expect(typeof param.key).toBe('string');
        expect(param).toHaveProperty('type');
        expect(['string', 'number', 'boolean']).toContain(param.type);
        expect(param).toHaveProperty('required');
        expect(typeof param.required).toBe('boolean');
        expect(param).toHaveProperty('description');
        expect(typeof param.description).toBe('string');
      }
    }
  });

  it('ui_diff_check 应使用 base_image/compare_image 替代标准 image 参数', () => {
    const diff = VISION_CAPABILITIES.find((c) => c.id === 'ui_diff_check')!;
    const keys = diff.params.map((p) => p.key);
    expect(keys).toContain('base_image');
    expect(keys).toContain('compare_image');
    expect(keys).not.toContain('image');
  });

  it('video_analysis 应使用 video_file 替代标准 image 参数', () => {
    const vid = VISION_CAPABILITIES.find((c) => c.id === 'video_analysis')!;
    const keys = vid.params.map((p) => p.key);
    expect(keys).toContain('video_file');
    expect(keys).not.toContain('image');
  });

  it('ui_to_artifact 应包含必填 type 参数', () => {
    const tool = VISION_CAPABILITIES.find((c) => c.id === 'ui_to_artifact')!;
    const typeParam = tool.params.find((p) => p.key === 'type');
    expect(typeParam).toBeDefined();
    expect(typeParam!.required).toBe(true);
  });
});
