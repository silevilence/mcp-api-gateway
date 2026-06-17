import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleVision, VisionError } from './visionService.js';
import { initSettings, updateSettings, setDataDir } from './settingsStore.js';
import type { AiProvider, AiModel } from '../../shared/types.js';

let testDataDir: string;

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({
    text: 'Mocked vision analysis result',
    finishReason: 'stop',
  })),
  streamText: vi.fn(),
}));

function makeProvider(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    id: 'p-vision',
    name: 'Vision Provider',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeModel(overrides: Partial<AiModel> = {}): AiModel {
  return {
    id: 'm-vision',
    providerId: 'p-vision',
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    supportsVision: true,
    supportsThinking: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const MOCK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

beforeAll(() => {
  testDataDir = mkdtempSync(join(tmpdir(), 'mcp-api-gateway-test-'));
  setDataDir(testDataDir);
});

afterAll(() => {
  rmSync(testDataDir, { recursive: true, force: true });
});

describe('visionService', () => {
  beforeEach(async () => {
    await initSettings();
    updateSettings({
      providers: [makeProvider()],
      models: [makeModel()],
    });
  });

  describe('handleVision', () => {
    it('ocr 应成功调用并返回文本结果', async () => {
      const result = await handleVision({
        tool: 'ocr',
        image: MOCK_IMAGE,
      });
      expect(result.text).toBeDefined();
      expect(result.modelUsed).toBe('GPT-4o');
    });

    it('缺少 image 参数应抛出 VisionError', async () => {
      await expect(handleVision({ tool: 'ocr' })).rejects.toThrow(VisionError);
    });

    it('ui_diff_check 缺少 base_image 应抛出错误', async () => {
      await expect(handleVision({
        tool: 'ui_diff_check',
        compareImage: MOCK_IMAGE,
      })).rejects.toThrow(VisionError);
    });

    it('video_analysis 缺少 video_file 应抛出错误', async () => {
      await expect(handleVision({ tool: 'video_analysis' })).rejects.toThrow(VisionError);
    });

    it('无效的 image 格式应抛出错误', async () => {
      await expect(handleVision({
        tool: 'ocr',
        image: 'not-an-image',
      })).rejects.toThrow(VisionError);
    });

    it('不存在的 modelId 应抛出错误', async () => {
      await expect(handleVision({
        tool: 'ocr',
        image: MOCK_IMAGE,
        modelId: 'nonexistent',
      })).rejects.toThrow(VisionError);
    });

    it('非视觉模型应抛出错误', async () => {
      updateSettings({
        models: [makeModel({ id: 'm-nonvision', supportsVision: false })],
      });
      await expect(handleVision({
        tool: 'ocr',
        image: MOCK_IMAGE,
        modelId: 'm-nonvision',
      })).rejects.toThrow(VisionError);
    });

    it('image_analysis 应正常工作', async () => {
      const result = await handleVision({
        tool: 'image_analysis',
        image: MOCK_IMAGE,
        prompt: '分析这张图片',
      });
      expect(result.text).toBeDefined();
    });

    it('ui_to_artifact 应接受 type 参数', async () => {
      const result = await handleVision({
        tool: 'ui_to_artifact',
        image: MOCK_IMAGE,
        type: 'Code',
      });
      expect(result.text).toBeDefined();
    });

    it('HTTP URL 图片应被接受', async () => {
      const result = await handleVision({
        tool: 'ocr',
        image: 'https://example.com/image.png',
      });
      expect(result.text).toBeDefined();
    });

    it('video_analysis 应处理 HTTP URL', async () => {
      const result = await handleVision({
        tool: 'video_analysis',
        videoFile: 'https://example.com/video.mp4',
      });
      expect(result.text).toBeDefined();
    });
  });
});
