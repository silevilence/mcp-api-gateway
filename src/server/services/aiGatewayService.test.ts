import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiGatewayError, resolveClient, clearClientCache } from './aiGatewayService.js';
import { initSettings, updateSettings } from './settingsStore.js';
import type { AiProvider, AiModel } from '../../shared/types.js';

// Mock AI SDK modules
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(),
  })),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => ({
    chat: vi.fn(),
  })),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => ({
    chat: vi.fn(),
  })),
}));

function makeProvider(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    id: 'p-test',
    name: 'Test Provider',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test-key',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeModel(overrides: Partial<AiModel> = {}): AiModel {
  return {
    id: 'm-test',
    providerId: 'p-test',
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    supportsVision: true,
    supportsThinking: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('aiGatewayService', () => {
  beforeEach(async () => {
    await initSettings();
    clearClientCache();
    updateSettings({
      providers: [makeProvider()],
      models: [makeModel()],
    });
  });

  describe('resolveClient', () => {
    it('应根据 modelId 查找并创建对应供应商客户端', () => {
      const result = resolveClient('m-test');
      expect(result).toBeDefined();
      expect(result.modelId).toBe('gpt-4o');
      expect(result.provider).toBeDefined();
    });

    it('不存在的 modelId 应抛出 AiGatewayError', () => {
      expect(() => resolveClient('nonexistent')).toThrow(AiGatewayError);
    });

    it('供应商被禁用时应抛出 AiGatewayError', () => {
      updateSettings({
        providers: [makeProvider({ enabled: false })],
      });
      clearClientCache();
      expect(() => resolveClient('m-test')).toThrow(AiGatewayError);
    });

    it('第二次请求相同 modelId 应命中缓存', () => {
      const r1 = resolveClient('m-test');
      const r2 = resolveClient('m-test');
      expect(r1.provider).toBe(r2.provider);
    });
  });

  describe('clearClientCache', () => {
    it('清除后应重新创建客户端', () => {
      const r1 = resolveClient('m-test');
      clearClientCache();
      const r2 = resolveClient('m-test');
      expect(r2).toBeDefined();
    });
  });
});
