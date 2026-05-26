// ============================================================
// /api 命名空间 · 审计日志路由
// ============================================================
import { Router, type Request, type Response } from 'express';
import { getRecentLogsAsync, rotateLogs, getRetentionDays } from '../../services/auditService.js';
import type { ApiResponse, AuditLog } from '../../../shared/types.js';

export const apiAuditRouter = Router();

// GET /api/audit-logs
apiAuditRouter.get('/', async (req: Request, res: Response) => {
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
  const logs = await getRecentLogsAsync(Math.min(Math.max(limit, 1), 200));
  const body: ApiResponse<AuditLog[]> = { code: 0, message: 'ok', data: logs };
  res.json(body);
});

// POST /api/audit-logs/rotate —— 手动触发日志轮转
apiAuditRouter.post('/rotate', (_req: Request, res: Response) => {
  const removed = rotateLogs();
  const body: ApiResponse = {
    code: 0,
    message: 'ok',
    data: { removed, retentionDays: getRetentionDays() },
  };
  res.json(body);
});
