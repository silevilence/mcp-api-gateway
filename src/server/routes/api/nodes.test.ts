// ============================================================
// /api/nodes 路由 · 集成测试 (supertest)
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { apiNodeRouter } from './nodes.js';
import * as store from '../../services/store.js';
import * as projectService from '../../services/projectService.js';
import type { ApiNode } from '../../../shared/types.js';

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/nodes', apiNodeRouter);
  return app;
}

describe('/api/nodes 路由', () => {
  let app: Express;
  let projectId: string;

  beforeEach(() => {
    store.clearAllData();
    app = createApp();
    const project = projectService.createProject({ name: '测试项目', type: 'custom' });
    projectId = project.id;
  });

  it('POST /api/nodes 应创建节点', async () => {
    const res = await request(app)
      .post('/api/nodes')
      .send({ projectId, name: 'API-1', method: 'GET', path: '/users' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.name).toBe('API-1');
    expect(res.body.data.projectId).toBe(projectId);
  });

  it('缺少 projectId 时应返回 400', async () => {
    const res = await request(app)
      .post('/api/nodes')
      .send({ name: 'API-1', method: 'GET', path: '/users' });
    expect(res.status).toBe(400);
  });

  it('不存在的 projectId 时应返回 400', async () => {
    const res = await request(app)
      .post('/api/nodes')
      .send({ projectId: 'nonexistent', name: 'API-1', method: 'GET', path: '/users' });
    expect(res.status).toBe(400);
  });

  it('GET /api/nodes 应返回节点列表', async () => {
    await request(app)
      .post('/api/nodes')
      .send({ projectId, name: 'API-1', method: 'GET', path: '/users' });

    const res = await request(app).get('/api/nodes');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/nodes?projectId=xxx 应按项目过滤', async () => {
    const project2 = projectService.createProject({ name: '项目2', type: 'custom' });
    await request(app).post('/api/nodes').send({ projectId, name: 'N1', method: 'GET', path: '/a' });
    await request(app).post('/api/nodes').send({ projectId: project2.id, name: 'N2', method: 'POST', path: '/b' });

    const res = await request(app).get(`/api/nodes?projectId=${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('N1');
  });

  it('PUT /api/nodes/:id 应更新节点', async () => {
    const create = await request(app)
      .post('/api/nodes')
      .send({ projectId, name: '旧名', method: 'GET', path: '/old' });
    const id: string = create.body.data.id;

    const res = await request(app)
      .put(`/api/nodes/${id}`)
      .send({ name: '新名', path: '/new' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('新名');
    expect(res.body.data.path).toBe('/new');
  });

  it('DELETE /api/nodes/:id 应删除节点', async () => {
    const create = await request(app)
      .post('/api/nodes')
      .send({ projectId, name: '待删', method: 'DELETE', path: '/tmp' });
    const id: string = create.body.data.id;

    const del = await request(app).delete(`/api/nodes/${id}`);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/nodes/${id}`);
    expect(get.status).toBe(404);
  });

  it('POST /api/nodes/:id/archive 应归档节点', async () => {
    const create = await request(app)
      .post('/api/nodes')
      .send({ projectId, name: 'ToHide', method: 'GET', path: '/hidden' });
    const id: string = create.body.data.id;

    const res = await request(app).post(`/api/nodes/${id}/archive`);
    expect(res.status).toBe(200);
    expect(res.body.data.hidden).toBe(true);
  });

  it('POST /api/nodes/:id/unarchive 应恢复节点可见性', async () => {
    const create = await request(app)
      .post('/api/nodes')
      .send({ projectId, name: 'ToShow', method: 'GET', path: '/visible' });
    const id: string = create.body.data.id;

    await request(app).post(`/api/nodes/${id}/archive`);
    const res = await request(app).post(`/api/nodes/${id}/unarchive`);
    expect(res.status).toBe(200);
    expect(res.body.data.hidden).toBe(false);
  });

  it('不支持的 HTTP 方法应返回 400', async () => {
    const res = await request(app)
      .post('/api/nodes')
      .send({ projectId, name: 'Bad', method: 'OPTIONS', path: '/x' });
    expect(res.status).toBe(400);
  });
});
