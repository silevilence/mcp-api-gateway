// ============================================================
// AI SDK 统一调用网关 · 多供应商路由 + 客户端缓存
// ============================================================
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  getSettings,
  getDecryptedApiKey,
  getModelsByProvider,
} from './settingsStore.js';
import type { AiProvider, AiModel } from '../../shared/types.js';

// ---- 错误类型 ----
export class AiGatewayError extends Error {
  code: number;
  providerError?: unknown;
  constructor(message: string, code: number, providerError?: unknown) {
    super(message);
    this.name = 'AiGatewayError';
    this.code = code;
    this.providerError = providerError;
  }
}

// ---- 客户端缓存 ----
interface ResolvedClient {
  provider: ReturnType<typeof createOpenAI> | ReturnType<typeof createGoogleGenerativeAI> | ReturnType<typeof createAnthropic>;
  modelId: string;
}

const clientCache = new Map<string, ResolvedClient>();

/** 查找模型配置 */
function findModel(modelDbId: string): AiModel {
  const settings = getSettings();
  const model = settings.models.find((m) => m.id === modelDbId);
  if (!model) {
    throw new AiGatewayError(`模型 ${modelDbId} 不存在`, 404);
  }
  return model;
}

/** 查找供应商配置 */
function findProvider(providerId: string): AiProvider {
  const settings = getSettings();
  const provider = settings.providers.find((p) => p.id === providerId);
  if (!provider) {
    throw new AiGatewayError(`供应商 ${providerId} 不存在`, 404);
  }
  if (!provider.enabled) {
    throw new AiGatewayError(`供应商 ${provider.name} 已被禁用`, 403);
  }
  return provider;
}

/** 创建 AI SDK 客户端 */
function createClient(provider: AiProvider): ResolvedClient['provider'] {
  const apiKey = getDecryptedApiKey(provider.id) ?? '';
  const baseURL = provider.baseUrl || undefined;

  switch (provider.type) {
    case 'openai':
    case 'ollama':
      return createOpenAI({ apiKey, baseURL });
    case 'google':
      return createGoogleGenerativeAI({ apiKey, baseURL });
    case 'anthropic':
      return createAnthropic({ apiKey, baseURL });
    default:
      throw new AiGatewayError(`不支持的供应商类型: ${provider.type}`, 400);
  }
}

/**
 * 根据 modelId（数据库 ID）解析并缓存 AI SDK 客户端
 * 返回 provider 实例和实际的 SDK modelId
 */
export function resolveClient(modelDbId: string): ResolvedClient {
  const cached = clientCache.get(modelDbId);
  if (cached) return cached;

  const model = findModel(modelDbId);
  const provider = findProvider(model.providerId);
  const client = createClient(provider);

  const resolved: ResolvedClient = {
    provider: client,
    modelId: model.modelId,
  };

  clientCache.set(modelDbId, resolved);
  return resolved;
}

/** 清除客户端缓存（供应商/模型配置变更时调用） */
export function clearClientCache(): void {
  clientCache.clear();
}

/** 根据供应商 ID 获取该供应商所有模型 */
export function listProviderModels(providerId: string): AiModel[] {
  return getModelsByProvider(providerId);
}
