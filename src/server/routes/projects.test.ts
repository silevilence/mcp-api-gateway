// ============================================================
// 项目路由 · 集成测试 (supertest)
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { projectRouter } from '../routes/projects.js';
import * as store from '../services/store.js';

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/internal/projects', projectRouter);
  return app;
}

describe('项目路由', () => {
  let app: Express;

  beforeEach(() => {
    store.clearAllData();
    app = createApp();
  });

  it('POST /internal/projects 应创建项目', async () => {
    const res = await request(app)
      .post('/internal/projects')
      .send({ name: '新项目', type: 'custom' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.name).toBe('新项目');
  });

  it('GET /internal/projects 应返回项目列表', async () => {
    await request(app).post('/internal/projects').send({ name: 'P1', type: 'custom' });
    await request(app).post('/internal/projects').send({ name: 'P2', type: 'openapi' });

    const res = await request(app).get('/internal/projects');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('GET /internal/projects/:id 应返回单个项目', async () => {
    const create = await request(app).post('/internal/projects').send({ name: 'P1', type: 'custom' });
    const id: string = create.body.data.id;

    const res = await request(app).get(`/internal/projects/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('PUT /internal/projects/:id 应更新项目', async () => {
    const create = await request(app).post('/internal/projects').send({ name: '旧名', type: 'custom' });
    const id: string = create.body.data.id;

    const res = await request(app)
      .put(`/internal/projects/${id}`)
      .send({ name: '新名' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('新名');
  });

  it('DELETE /internal/projects/:id 应删除项目', async () => {
    const create = await request(app).post('/internal/projects').send({ name: '待删', type: 'custom' });
    const id: string = create.body.data.id;

    const del = await request(app).delete(`/internal/projects/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.code).toBe(0);

    const get = await request(app).get(`/internal/projects/${id}`);
    expect(get.status).toBe(404);
  });

  it('缺少必填字段时应返回 400', async () => {
    const res = await request(app)
      .post('/internal/projects')
      .send({ type: 'custom' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });
});
