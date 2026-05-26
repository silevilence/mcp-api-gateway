// ============================================================
// API 项目集路由 · CRUD
// ============================================================
import { Router, type Request, type Response } from 'express';
import * as projectService from '../services/projectService.js';
import type { ApiResponse } from '../../shared/types.js';

export const projectRouter = Router();

// GET /internal/projects
projectRouter.get('/', (_req: Request, res: Response) => {
  const projects = projectService.listProjects();
  const body: ApiResponse = { code: 0, message: 'ok', data: projects };
  res.json(body);
});

// GET /internal/projects/:id
projectRouter.get('/:id', (req: Request, res: Response) => {
  const project = projectService.getProject(req.params.id as string);
  if (!project) {
    const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: project };
  res.json(body);
});

// POST /internal/projects
projectRouter.post('/', (req: Request, res: Response) => {
  const { name, description, type, sourceUrl, localJsonPath } = req.body as Record<string, unknown>;

  if (!name || typeof name !== 'string') {
    const body: ApiResponse = { code: 400, message: '项目名称 (name) 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  if (type !== 'custom' && type !== 'openapi') {
    const body: ApiResponse = { code: 400, message: '项目类型 (type) 必须为 custom 或 openapi', data: null };
    res.status(400).json(body);
    return;
  }

  const project = projectService.createProject({
    name,
    description: typeof description === 'string' ? description : undefined,
    type,
    sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : undefined,
    localJsonPath: typeof localJsonPath === 'string' ? localJsonPath : undefined,
  });

  const body: ApiResponse = { code: 0, message: 'ok', data: project };
  res.status(201).json(body);
});

// PUT /internal/projects/:id
projectRouter.put('/:id', (req: Request, res: Response) => {
  const updated = projectService.updateProject(req.params.id as string, req.body as Record<string, unknown>);
  if (!updated) {
    const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: updated };
  res.json(body);
});

// DELETE /internal/projects/:id
projectRouter.delete('/:id', (req: Request, res: Response) => {
  const deleted = projectService.deleteProject(req.params.id as string);
  if (!deleted) {
    const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: null };
  res.json(body);
});
