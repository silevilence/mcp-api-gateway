// ============================================================
// /api 命名空间 · 文件系统操作路由
// 端点前缀: /api/filesystem
// ============================================================
import { Router, type Request, type Response } from 'express';
import * as fsService from '../../services/fileSystemService.js';
import { getProject } from '../../services/projectService.js';
import type { ApiResponse } from '../../../shared/types.js';

export const fileSystemRouter = Router();

// ---- 辅助：获取项目的 workspaceRoot ----
function getWorkspaceRoot(projectId: string, res: Response): string | null {
  const project = getProject(projectId);
  if (!project) {
    const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
    res.status(404).json(body);
    return null;
  }
  if (project.type !== 'filesystem') {
    const body: ApiResponse = { code: 400, message: '该项目不是文件系统类型', data: null };
    res.status(400).json(body);
    return null;
  }
  if (!project.workspaceRoot) {
    const body: ApiResponse = { code: 400, message: '文件系统项目未配置工作区根目录', data: null };
    res.status(400).json(body);
    return null;
  }
  return project.workspaceRoot;
}

// POST /api/filesystem/glob
fileSystemRouter.post('/glob', async (req: Request, res: Response) => {
  try {
    const { projectId, pattern, path } = req.body as Record<string, unknown>;
    if (!projectId || typeof projectId !== 'string') {
      const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (!pattern || typeof pattern !== 'string') {
      const body: ApiResponse = { code: 400, message: 'pattern 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }

    const workspaceRoot = getWorkspaceRoot(projectId, res);
    if (!workspaceRoot) return;

    const result = await fsService.glob(
      pattern,
      typeof path === 'string' ? path : undefined,
      workspaceRoot,
    );
    const body: ApiResponse = { code: 0, message: 'ok', data: result };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件系统操作失败';
    const code = err instanceof fsService.FileSystemError ? err.code : 500;
    const body: ApiResponse = { code, message, data: null };
    res.status(code >= 400 && code < 500 ? code : 500).json(body);
  }
});

// POST /api/filesystem/ls
fileSystemRouter.post('/ls', async (req: Request, res: Response) => {
  try {
    const { projectId, path, recursive } = req.body as Record<string, unknown>;
    if (!projectId || typeof projectId !== 'string') {
      const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }

    const workspaceRoot = getWorkspaceRoot(projectId, res);
    if (!workspaceRoot) return;

    const result = fsService.ls(
      typeof path === 'string' ? path : undefined,
      recursive === true,
      workspaceRoot,
    );
    const body: ApiResponse = { code: 0, message: 'ok', data: result };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件系统操作失败';
    const code = err instanceof fsService.FileSystemError ? err.code : 500;
    const body: ApiResponse = { code, message, data: null };
    res.status(code >= 400 && code < 500 ? code : 500).json(body);
  }
});

// POST /api/filesystem/grep
fileSystemRouter.post('/grep', async (req: Request, res: Response) => {
  try {
    const { projectId, pattern, path, include } = req.body as Record<string, unknown>;
    if (!projectId || typeof projectId !== 'string') {
      const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (!pattern || typeof pattern !== 'string') {
      const body: ApiResponse = { code: 400, message: 'pattern 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }

    const workspaceRoot = getWorkspaceRoot(projectId, res);
    if (!workspaceRoot) return;

    const result = await fsService.grep(
      pattern,
      typeof path === 'string' ? path : undefined,
      typeof include === 'string' ? include : undefined,
      workspaceRoot,
    );
    const body: ApiResponse = { code: 0, message: 'ok', data: result };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件系统操作失败';
    const code = err instanceof fsService.FileSystemError ? err.code : 500;
    const body: ApiResponse = { code, message, data: null };
    res.status(code >= 400 && code < 500 ? code : 500).json(body);
  }
});

// POST /api/filesystem/read
fileSystemRouter.post('/read', async (req: Request, res: Response) => {
  try {
    const { projectId, file_path, offset, limit } = req.body as Record<string, unknown>;
    if (!projectId || typeof projectId !== 'string') {
      const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (!file_path || typeof file_path !== 'string') {
      const body: ApiResponse = { code: 400, message: 'file_path 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }

    const workspaceRoot = getWorkspaceRoot(projectId, res);
    if (!workspaceRoot) return;

    const result = await fsService.read(
      file_path,
      typeof offset === 'number' ? offset : undefined,
      typeof limit === 'number' ? limit : undefined,
      workspaceRoot,
    );
    const body: ApiResponse = { code: 0, message: 'ok', data: result };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件系统操作失败';
    const code = err instanceof fsService.FileSystemError ? err.code : 500;
    const body: ApiResponse = { code, message, data: null };
    res.status(code >= 400 && code < 500 ? code : 500).json(body);
  }
});

// POST /api/filesystem/edit
fileSystemRouter.post('/edit', async (req: Request, res: Response) => {
  try {
    const { projectId, file_path, old_string, new_string, replace_all } = req.body as Record<string, unknown>;
    if (!projectId || typeof projectId !== 'string') {
      const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (!file_path || typeof file_path !== 'string') {
      const body: ApiResponse = { code: 400, message: 'file_path 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (!old_string || typeof old_string !== 'string') {
      const body: ApiResponse = { code: 400, message: 'old_string 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (typeof new_string !== 'string') {
      const body: ApiResponse = { code: 400, message: 'new_string 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }

    const workspaceRoot = getWorkspaceRoot(projectId, res);
    if (!workspaceRoot) return;

    const result = await fsService.edit(
      file_path,
      old_string,
      new_string,
      replace_all === true,
      workspaceRoot,
    );
    const body: ApiResponse = { code: 0, message: 'ok', data: result };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件系统操作失败';
    const code = err instanceof fsService.FileSystemError ? err.code : 500;
    const body: ApiResponse = { code, message, data: null };
    res.status(code >= 400 && code < 500 ? code : 500).json(body);
  }
});

// POST /api/filesystem/write
fileSystemRouter.post('/write', async (req: Request, res: Response) => {
  try {
    const { projectId, file_path, content } = req.body as Record<string, unknown>;
    if (!projectId || typeof projectId !== 'string') {
      const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (!file_path || typeof file_path !== 'string') {
      const body: ApiResponse = { code: 400, message: 'file_path 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (typeof content !== 'string') {
      const body: ApiResponse = { code: 400, message: 'content 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }

    const workspaceRoot = getWorkspaceRoot(projectId, res);
    if (!workspaceRoot) return;

    const result = await fsService.write(file_path, content, workspaceRoot);
    const body: ApiResponse = { code: 0, message: 'ok', data: result };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件系统操作失败';
    const code = err instanceof fsService.FileSystemError ? err.code : 500;
    const body: ApiResponse = { code, message, data: null };
    res.status(code >= 400 && code < 500 ? code : 500).json(body);
  }
});

// POST /api/filesystem/delete
fileSystemRouter.post('/delete', async (req: Request, res: Response) => {
  try {
    const { projectId, path, recursive } = req.body as Record<string, unknown>;
    if (!projectId || typeof projectId !== 'string') {
      const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }
    if (!path || typeof path !== 'string') {
      const body: ApiResponse = { code: 400, message: 'path 为必填字段', data: null };
      res.status(400).json(body);
      return;
    }

    const workspaceRoot = getWorkspaceRoot(projectId, res);
    if (!workspaceRoot) return;

    const result = await fsService.deletePath(path, recursive === true, workspaceRoot);
    const body: ApiResponse = { code: 0, message: 'ok', data: result };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件系统操作失败';
    const code = err instanceof fsService.FileSystemError ? err.code : 500;
    const body: ApiResponse = { code, message, data: null };
    res.status(code >= 400 && code < 500 ? code : 500).json(body);
  }
});
