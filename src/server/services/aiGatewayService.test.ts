import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AiGatewayError, resolveClient, clearClientCache, listProviderModels } from './aiGatewayService.js';
import { initSettings, updateSettings, setDataDir } from './settingsStore.js';
import type { AiProvider, AiModel } from '../../shared/types.js';

let testDataDir: string;

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

beforeAll(() => {
  testDataDir = mkdtempSync(join(tmpdir(), 'mcp-api-gateway-test-'));
  setDataDir(testDataDir);
});

afterAll(() => {
  rmSync(testDataDir, { recursive: true, force: true });
});

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

    it('供应商不存在时应抛出 AiGatewayError (404)', () => {
      updateSettings({
        models: [makeModel({ id: 'm-orphan', providerId: 'nonexistent' })],
      });
      clearClientCache();
      try {
        resolveClient('m-orphan');
        expect.fail('应抛出 AiGatewayError');
      } catch (err) {
        expect(err).toBeInstanceOf(AiGatewayError);
        expect((err as AiGatewayError).code).toBe(404);
      }
    });

    it('4 种合法供应商类型均应成功创建客户端', () => {
      const validTypes = ['openai', 'google', 'anthropic', 'ollama'] as const;
      for (const t of validTypes) {
        updateSettings({
          providers: [makeProvider({ id: `p-${t}`, type: t })],
          models: [makeModel({ id: `m-${t}`, providerId: `p-${t}`, modelId: 'test' })],
        });
        clearClientCache();
        const result = resolveClient(`m-${t}`);
        expect(result).toBeDefined();
      }
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

  describe('listProviderModels', () => {
    it('应返回指定供应商的所有模型', () => {
      updateSettings({
        models: [
          makeModel({ id: 'm1', modelId: 'gpt-4o' }),
          makeModel({ id: 'm2', modelId: 'gpt-4o-mini' }),
        ],
      });

      const models = listProviderModels('p-test');
      expect(models).toHaveLength(2);
      expect(models[0].modelId).toBe('gpt-4o');
      expect(models[1].modelId).toBe('gpt-4o-mini');
    });

    it('供应商不存在时应返回空数组', () => {
      const models = listProviderModels('nonexistent');
      expect(models).toEqual([]);
    });
  });
});
