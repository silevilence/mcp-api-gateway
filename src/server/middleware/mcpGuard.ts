// ============================================================
// MCP 网关守卫中间件 · 校验项目级 MCP 请求
// ============================================================
import type { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/projectService.js';
import type { ApiResponse } from '../../shared/types.js';

/**
 * 校验 /api/:slug/mcp 请求的合法性：
 * 1. :slug 对应的项目存在
 * 2. 项目已配置 slug
 * 3. 项目已启用 MCP
 */
export function mcpGuard(req: Request, res: Response, next: NextFunction): void {
  const slug = req.params.slug as string;

  if (!slug) {
    const body: ApiResponse = { code: 400, message: '缺少项目标识', data: null };
    res.status(400).json(body);
    return;
  }

  // 查找 slug 对应的项目
  const projects = projectService.listProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    const body: ApiResponse = { code: 404, message: `未找到标识为「${slug}」的项目`, data: null };
    res.status(404).json(body);
    return;
  }

  if (!project.slug) {
    const body: ApiResponse = { code: 403, message: '项目未配置标识，无法启用 MCP 服务', data: null };
    res.status(403).json(body);
    return;
  }

  if (!project.mcpEnabled) {
    const body: ApiResponse = { code: 403, message: 'MCP 服务未启用，请在项目设置中开启', data: null };
    res.status(403).json(body);
    return;
  }

  // 将项目信息挂载到请求上供后续使用
  (req as Request & { projectId: string }).projectId = project.id;

  next();
}
