// ============================================================
// /api 命名空间 · 在线调试沙箱路由
// ============================================================
import { Router, type Request, type Response } from 'express';
import { execute } from '../../services/sandboxService.js';
import type { ApiResponse, SandboxResponse } from '../../../shared/types.js';

export const sandboxRouter = Router();

// POST /api/sandbox/execute
sandboxRouter.post('/execute', async (req: Request, res: Response) => {
  const { nodeId, paramValues, baseUrlOverride } = req.body as Record<string, unknown>;

  if (!nodeId || typeof nodeId !== 'string') {
    const body: ApiResponse = { code: 400, message: 'nodeId 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  try {
    const result: SandboxResponse = await execute(
      nodeId,
      (paramValues as Record<string, unknown>) ?? {},
      typeof baseUrlOverride === 'string' ? baseUrlOverride : undefined,
    );
    const body: ApiResponse<SandboxResponse> = { code: 0, message: 'ok', data: result };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '沙箱执行失败';
    const body: ApiResponse = { code: 500, message, data: null };
    res.status(500).json(body);
  }
});
