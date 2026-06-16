// ============================================================
// /api 命名空间 · 视觉智能操作路由
// 端点前缀: /api/vision
// ============================================================
import { Router, type Request, type Response } from 'express';
import type { ApiResponse } from '../../../shared/types.js';
import { VISION_CAPABILITIES } from '../../../shared/types.js';
import { handleVision, VisionError } from '../../services/visionService.js';
import type { VisionRequest } from '../../services/visionService.js';

export const visionRouter = Router();

// ---- 辅助：统一错误处理 ----
function respondError(res: Response, err: unknown): void {
  if (err instanceof VisionError) {
    const body: ApiResponse = { code: err.code, message: err.message, data: null };
    res.status(err.code >= 400 && err.code < 500 ? err.code : 500).json(body);
  } else {
    const message = err instanceof Error ? err.message : '视觉服务内部错误';
    const body: ApiResponse = { code: 500, message, data: null };
    res.status(500).json(body);
  }
}

// ---- 动态注册 5 个工具端点 ----
for (const cap of VISION_CAPABILITIES) {
  visionRouter.post(`/${cap.id}`, async (req: Request, res: Response) => {
    try {
      const params = req.body as VisionRequest;
      params.tool = cap.id;
      const result = await handleVision(params);
      const body: ApiResponse = { code: 0, message: 'ok', data: result };
      res.json(body);
    } catch (err: unknown) {
      respondError(res, err);
    }
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
