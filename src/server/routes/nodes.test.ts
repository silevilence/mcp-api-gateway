// ============================================================
// 节点路由 · 集成测试 (supertest)
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { nodeRouter } from '../routes/nodes.js';
import * as store from '../services/store.js';
import * as projectService from '../services/projectService.js';

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/internal/nodes', nodeRouter);
  return app;
}

describe('节点路由', () => {
  let app: Express;
  let projectId: string;

  beforeEach(() => {
    store.clearAllData();
    const p = projectService.createProject({ name: 'Test', type: 'custom' });
    projectId = p.id;
    app = createApp();
  });

  it('POST /internal/nodes 应创建节点', async () => {
    const res = await request(app)
      .post('/internal/nodes')
      .send({ projectId, name: '获取用户', method: 'GET', path: '/users' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('获取用户');
  });

  it('GET /internal/nodes 应支持按 projectId 筛选', async () => {
    await request(app).post('/internal/nodes').send({ projectId, name: 'N1', method: 'GET', path: '/a' });
    await request(app).post('/internal/nodes').send({ projectId, name: 'N2', method: 'POST', path: '/b' });

    const res = await request(app).get(`/internal/nodes?projectId=${projectId}`);
    expect(res.body.data).toHaveLength(2);
  });

  it('POST /internal/nodes/:id/archive 应归档节点', async () => {
    const create = await request(app).post('/internal/nodes').send({ projectId, name: 'N', method: 'GET', path: '/' });
    const id: string = create.body.data.id;

    const res = await request(app).post(`/internal/nodes/${id}/archive`);
    expect(res.body.data.hidden).toBe(true);
  });

  it('POST /internal/nodes/:id/unarchive 应取消归档', async () => {
    const create = await request(app).post('/internal/nodes').send({ projectId, name: 'N', method: 'GET', path: '/' });
    const id: string = create.body.data.id;

    await request(app).post(`/internal/nodes/${id}/archive`);
    const res = await request(app).post(`/internal/nodes/${id}/unarchive`);
    expect(res.body.data.hidden).toBe(false);
  });

  it('OpenAPI 源节点不可修改 method/path', async () => {
    const openapiNode = {
      id: 'openapi-n1', projectId, name: '端点', description: '',
      method: 'GET' as const, path: '/openapi', params: [],
      hidden: false, source: 'openapi' as const,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    store.insertNode(openapiNode);

    const res = await request(app)
      .put('/internal/nodes/openapi-n1')
      .send({ method: 'POST', remark: '新增备注' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
  });
});
