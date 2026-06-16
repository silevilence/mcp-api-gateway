// ============================================================
// /api 命名空间 · 视觉智能操作路由 (子系统 ① 骨架)
// 端点前缀: /api/vision
// 子系统 ② 将在此实现 5 个视觉工具的完整逻辑
// ============================================================
import { Router, type Request, type Response } from 'express';
import type { ApiResponse } from '../../../shared/types.js';
import { VISION_CAPABILITIES } from '../../../shared/types.js';

export const visionRouter = Router();

const NOT_IMPL: ApiResponse = { code: 501, message: '视觉工具尚未实现（子系统 ②）', data: null };

// 为每个视觉能力注册 POST 端点骨架
for (const cap of VISION_CAPABILITIES) {
  visionRouter.post(`/${cap.id}`, (_req: Request, res: Response) => {
    res.status(501).json(NOT_IMPL);
  });
}

// GET /api/vision/capabilities —— 列出所有视觉能力元数据
visionRouter.get('/capabilities', (_req: Request, res: Response) => {
  const body: ApiResponse = {
    code: 0,
    message: 'ok',
    data: VISION_CAPABILITIES,
  };
  res.json(body);
});
