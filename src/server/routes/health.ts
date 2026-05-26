// ============================================================
// 健康检查路由 · 供前端探活及部署监控使用
// ============================================================
import { Router, type Request, type Response } from 'express';

export const healthRouter = Router();

/** 独立导出的 handler，便于单元测试直接调用 */
export function handleHealth(_req: Request, res: Response): void {
  res.json({
    code: 0,
    message: 'ok',
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
}

healthRouter.get('/health', handleHealth);
