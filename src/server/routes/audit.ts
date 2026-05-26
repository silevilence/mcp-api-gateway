// ============================================================
// 审计日志路由
// ============================================================
import { Router, type Request, type Response } from 'express';
import { getRecentLogs, rotateLogs, getRetentionDays } from '../services/auditService.js';
import type { ApiResponse, AuditLog } from '../../shared/types.js';

export const auditRouter = Router();

// GET /internal/audit-logs
auditRouter.get('/', (req: Request, res: Response) => {
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
  const logs = getRecentLogs(Math.min(Math.max(limit, 1), 200));
  const body: ApiResponse<AuditLog[]> = { code: 0, message: 'ok', data: logs };
  res.json(body);
});

// POST /internal/audit-logs/rotate —— 手动触发日志轮转
auditRouter.post('/rotate', (_req: Request, res: Response) => {
  const removed = rotateLogs();
  const body: ApiResponse = {
    code: 0,
    message: 'ok',
    data: { removed, retentionDays: getRetentionDays() },
  };
  res.json(body);
});
