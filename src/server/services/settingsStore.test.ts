import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  initSettings,
  getSettings,
  updateSettings,
  getProvider,
  getModelsByProvider,
  getDecryptedApiKey,
  maskApiKey,
} from './settingsStore.js';
import type { GlobalSettings } from '../../shared/types.js';

const TEST_DATA_DIR = join(process.cwd(), '.data');
const TEST_SETTINGS_FILE = join(TEST_DATA_DIR, 'settings.json');

function cleanSettingsFile() {
  if (existsSync(TEST_SETTINGS_FILE)) unlinkSync(TEST_SETTINGS_FILE);
}

describe('settingsStore', () => {
  beforeEach(() => {
    cleanSettingsFile();
  });

  afterEach(() => {
    cleanSettingsFile();
  });

  describe('initSettings', () => {
    it('文件不存在时应初始化为空配置', async () => {
      await initSettings();
      const settings = getSettings();
      expect(settings.providers).toEqual([]);
      expect(settings.models).toEqual([]);
    });

    it('文件存在时应正确加载已有配置', async () => {
      await initSettings();
      updateSettings({
        providers: [{
          id: 'p1',
          name: 'Test',
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      });

      await initSettings();
      const settings = getSettings();
      expect(settings.providers).toHaveLength(1);
      expect(settings.providers[0].name).toBe('Test');
    });

    it('JSON 文件损坏时应降级为空配置', async () => {
      const dir = join(process.cwd(), '.data');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'settings.json'), '{ corrupted json!!!');

      await initSettings();
      const settings = getSettings();
      expect(settings.providers).toEqual([]);
      expect(settings.models).toEqual([]);
    });
  });

  describe('updateSettings', () => {
    it('应支持合并式更新', async () => {
      await initSettings();

      updateSettings({
        providers: [{
          id: 'p1',
          name: 'OpenAI',
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-abc',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      });

      updateSettings({
        models: [{
          id: 'm1',
          providerId: 'p1',
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          supportsVision: true,
          supportsThinking: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      });

      const settings = getSettings();
      expect(settings.providers).toHaveLength(1);
      expect(settings.models).toHaveLength(1);
    });

    it('apiKey 明文写入后应加密存储，解密后恢复原文', async () => {
      await initSettings();
      const originalKey = 'sk-my-secret-key-12345';

      updateSettings({
        providers: [{
          id: 'p1',
          name: 'Test',
          type: 'openai',
          baseUrl: 'https://example.com',
          apiKey: originalKey,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      });

      const settings = getSettings();
      expect(settings.providers[0].apiKey).not.toBe(originalKey);

      const decrypted = getDecryptedApiKey('p1');
      expect(decrypted).toBe(originalKey);
    });
  });

  describe('getProvider', () => {
    it('应返回指定 ID 的供应商', async () => {
      await initSettings();
      updateSettings({
        providers: [{
          id: 'p1',
          name: 'OpenAI',
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      });

      const p = getProvider('p1');
      expect(p).toBeDefined();
      expect(p!.name).toBe('OpenAI');
    });

    it('不存在的 ID 应返回 undefined', async () => {
      await initSettings();
      expect(getProvider('nonexistent')).toBeUndefined();
    });
  });

  describe('getModelsByProvider', () => {
    it('应返回指定供应商的所有模型', async () => {
      await initSettings();
      updateSettings({
        providers: [
          { id: 'p1', name: 'P1', type: 'openai', baseUrl: '', apiKey: '', enabled: true, createdAt: '', updatedAt: '' },
        ],
        models: [
          { id: 'm1', providerId: 'p1', modelId: 'gpt-4o', displayName: 'GPT-4o', supportsVision: true, supportsThinking: false, createdAt: '', updatedAt: '' },
          { id: 'm2', providerId: 'p1', modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', supportsVision: true, supportsThinking: false, createdAt: '', updatedAt: '' },
        ],
      });

      const models = getModelsByProvider('p1');
      expect(models).toHaveLength(2);
    });

    it('无模型的供应商应返回空数组', async () => {
      await initSettings();
      updateSettings({
        providers: [{ id: 'p2', name: 'P2', type: 'google', baseUrl: '', apiKey: '', enabled: true, createdAt: '', updatedAt: '' }],
      });

      expect(getModelsByProvider('p2')).toEqual([]);
    });
  });

  describe('maskApiKey', () => {
    it('应脱敏标准长度密钥', () => {
      const result = maskApiKey('sk-very-long-api-key-12345678');
      expect(result).toBe('sk-****5678');
      expect(result).not.toContain('very-long');
    });

    it('应脱敏短密钥', () => {
      const result = maskApiKey('abc');
      expect(result).toBe('sk-****abc');
    });

    it('空字符串应返回 sk-****', () => {
      expect(maskApiKey('')).toBe('sk-****');
    });
  });
});
