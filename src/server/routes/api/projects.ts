// ============================================================
// /api 命名空间 · 项目集路由（CRUD）
// ============================================================
import { Router, type Request, type Response } from 'express';
import * as projectService from '../../services/projectService.js';
import type { ApiResponse } from '../../../shared/types.js';

export const apiProjectRouter = Router();

// GET /api/projects
apiProjectRouter.get('/', (_req: Request, res: Response) => {
  const projects = projectService.listProjects();
  const body: ApiResponse = { code: 0, message: 'ok', data: projects };
  res.json(body);
});

// GET /api/projects/:id
apiProjectRouter.get('/:id', (req: Request, res: Response) => {
  const project = projectService.getProject(req.params.id as string);
  if (!project) {
    const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: project };
  res.json(body);
});

// POST /api/projects
apiProjectRouter.post('/', (req: Request, res: Response) => {
  const { name, description, type, sourceUrl, localJsonPath, slug, workspaceRoot } = req.body as Record<string, unknown>;

  if (!name || typeof name !== 'string') {
    const body: ApiResponse = { code: 400, message: '项目名称 (name) 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  if (type !== 'custom' && type !== 'openapi' && type !== 'filesystem' && type !== 'vision') {
    const body: ApiResponse = { code: 400, message: '项目类型 (type) 必须为 custom、openapi、filesystem 或 vision', data: null };
    res.status(400).json(body);
    return;
  }

  // filesystem 类型必须配置 workspaceRoot
  if (type === 'filesystem' && (!workspaceRoot || typeof workspaceRoot !== 'string')) {
    const body: ApiResponse = { code: 400, message: '文件系统项目必须配置工作区根目录 (workspaceRoot)', data: null };
    res.status(400).json(body);
    return;
  }

  const project = projectService.createProject({
    name,
    description: typeof description === 'string' ? description : undefined,
    type,
    sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : undefined,
    localJsonPath: typeof localJsonPath === 'string' ? localJsonPath : undefined,
    slug: typeof slug === 'string' ? slug : undefined,
    workspaceRoot: typeof workspaceRoot === 'string' ? workspaceRoot : undefined,
  });

  const body: ApiResponse = { code: 0, message: 'ok', data: project };
  res.status(201).json(body);
});

// PUT /api/projects/:id
apiProjectRouter.put('/:id', (req: Request, res: Response) => {
  const updated = projectService.updateProject(req.params.id as string, req.body as Record<string, unknown>);
  if (!updated) {
    const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: updated };
  res.json(body);
});

// DELETE /api/projects/:id
apiProjectRouter.delete('/:id', (req: Request, res: Response) => {
  const deleted = projectService.deleteProject(req.params.id as string);
  if (!deleted) {
    const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: null };
  res.json(body);
});

// PATCH /api/projects/:id/slug —— 单独更新项目标识
apiProjectRouter.patch('/:id/slug', (req: Request, res: Response) => {
  const { slug } = req.body as Record<string, unknown>;
  if (!slug || typeof slug !== 'string') {
    const body: ApiResponse = { code: 400, message: 'slug 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  const result = projectService.updateProjectSlug(req.params.id as string, slug);
  if ('error' in result) {
    const body: ApiResponse = { code: result.code, message: result.error, data: null };
    res.status(result.code).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: result };
  res.json(body);
});
