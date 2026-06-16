// ============================================================
// /api 命名空间 · 全局设置路由
// 端点前缀: /api/settings
// ============================================================
import { Router, type Request, type Response } from 'express';
import {
  getSettings,
  updateSettings,
  maskApiKey,
  getProvider,
} from '../../services/settingsStore.js';
import { fetchModelsFromProvider } from '../../services/aiGatewayService.js';
import type { ApiResponse, GlobalSettings } from '../../../shared/types.js';

export const settingsRouter = Router();

/** 对返回的 settings 做 apiKey 脱敏处理 */
function sanitizeSettings(raw: GlobalSettings): GlobalSettings {
  return {
    providers: raw.providers.map((p) => ({
      ...p,
      apiKey: maskApiKey(p.apiKey),
    })),
    models: raw.models.map((m) => ({ ...m })),
  };
}

/** 处理 PUT 中的 apiKey 占位符：sk-****... 表示不修改现有值 */
function resolveApiKey(
  incoming: GlobalSettings['providers'],
  existing: GlobalSettings['providers'],
): GlobalSettings['providers'] {
  return incoming.map((p) => {
    if (p.apiKey && p.apiKey.startsWith('sk-****')) {
      // 占位符 → 保持原值
      const orig = existing.find((ep) => ep.id === p.id);
      return { ...p, apiKey: orig?.apiKey ?? p.apiKey };
    }
    return p;
  });
}

// GET /api/settings
settingsRouter.get('/', (_req: Request, res: Response) => {
  const raw = getSettings();
  const body: ApiResponse<GlobalSettings> = {
    code: 0,
    message: 'ok',
    data: sanitizeSettings(raw),
  };
  res.json(body);
});

// PUT /api/settings —— 合并式更新
settingsRouter.put('/', (req: Request, res: Response) => {
  try {
    const patch = req.body as Partial<GlobalSettings>;

    // apiKey 占位符处理
    if (patch.providers) {
      patch.providers = resolveApiKey(patch.providers, getSettings().providers);
    }

    const updated = updateSettings(patch);
    const body: ApiResponse<GlobalSettings> = {
      code: 0,
      message: 'ok',
      data: sanitizeSettings(updated),
    };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新设置失败';
    const body: ApiResponse = { code: 500, message, data: null };
    res.status(500).json(body);
  }
});

// GET /api/settings/providers/:providerId/models/fetch —— 从供应商拉取可用模型列表
settingsRouter.get('/providers/:providerId/models/fetch', async (req: Request, res: Response) => {
  try {
    const providerId = req.params.providerId as string;
    const provider = getProvider(providerId);
    if (!provider) {
      const body: ApiResponse = { code: 404, message: '供应商不存在', data: null };
      res.status(404).json(body);
      return;
    }

    const models = await fetchModelsFromProvider(providerId);

    // 过滤掉已注册的模型 ID
    const settings = getSettings();
    const existingIds = new Set(settings.models.filter((m) => m.providerId === providerId).map((m) => m.modelId));

    const body: ApiResponse = {
      code: 0,
      message: 'ok',
      data: models.map((m) => ({
        ...m,
        alreadyAdded: existingIds.has(m.id),
      })),
    };
    res.json(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取模型列表失败';
    const code = (err as { code?: number }).code ?? 500;
    const body: ApiResponse = { code, message, data: null };
    res.status(code >= 400 && code < 500 ? code : 500).json(body);
  }
});
