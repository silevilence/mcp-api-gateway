// ============================================================
// 视觉智能核心服务 · 多模态原子能力引擎
// ============================================================
import { generateText } from 'ai';
import { resolveClient } from './aiGatewayService.js';
import { getSettings } from './settingsStore.js';
import type { VisionCapability, AiModel } from '../../shared/types.js';

// ---- 错误类型 ----
export class VisionError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'VisionError';
    this.code = code;
  }
}

// ---- 类型 ----
export interface VisionRequest {
  tool: VisionCapability;
  /** 目标图像 (Base64 data URL 或 HTTP URL) */
  image?: string;
  /** 基准图 (ui_diff_check 专用) */
  baseImage?: string;
  /** 对比图 (ui_diff_check 专用) */
  compareImage?: string;
  /** 视频文件 (Base64 data URL 或 HTTP URL, video_analysis 专用) */
  videoFile?: string;
  /** 自定义提示词 */
  prompt?: string;
  /** 目标产物类型 (ui_to_artifact 专用) */
  type?: 'Code' | 'Prompt' | 'Spec' | 'Description';
  /** 是否流式响应 (子系统 ② 默认返回完整文本，预留扩展) */
  stream?: boolean;
  /** 指定执行模型 ID（设置中注册的 AiModel.id），未指定则自动选取首个视觉模型 */
  modelId?: string;
}

export interface VisionResponse {
  text: string;
  modelUsed: string;
  finishReason?: string;
}

// ---- 系统提示词映射 ----
const SYSTEM_PROMPTS: Record<VisionCapability, string> = {
  ui_to_artifact: `你是一个专业的 UI/UX 设计转代码专家。根据输入的 UI 视觉资产，将其转化为结构清晰、可维护的前端代码或设计规范。
输出要求：
- Code 模式：输出完整的 HTML/CSS/JS 或 React 组件代码，使用语义化标签，响应式设计
- Prompt 模式：输出一段高保真的 AI 绘图提示词，描述 UI 的视觉细节
- Spec 模式：输出系统级设计规范文档，包含颜色、字体、间距、组件层级
- Description 模式：输出多维自然语言描述，覆盖布局、交互、视觉风格
请根据用户指定的 type 参数选择对应的输出格式。`,

  ocr: `你是一个专业的 OCR 文本提取专家。基于多模态视觉感知能力，提取并识别输入图像中的结构化文本信息。
输出要求：
- 支持多语言识别（中文、英文、日文、韩文等）
- 保持原始排版结构（段落、表格、列表等）
- 对于复杂布局，先描述布局结构再提取文本
- 以清晰的 Markdown 格式输出提取结果`,

  ui_diff_check: `你是一个专业的 UI 质量保障 (QA) 专家。对比基准图（设计稿）与对比图（实现截图），输出详细的视觉偏差报告。
输出要求：
1. 总体相似度评估（百分比）
2. 布局差异：位置偏移、尺寸不一致、间距问题
3. 颜色差异：色值偏差、对比度问题
4. 字体差异：字号、字重、字体系列不一致
5. 组件差异：缺失元素、多余元素、状态差异
6. 优先级分类：Critical（阻塞发布）/ Major（需修复）/ Minor（可接受）
以结构化的 Markdown 报告格式输出。`,

  image_analysis: `你是一个通用的图像分析与理解专家。对输入的图像进行全面、深入的多维度解析。
输出要求：
1. 图像基本属性（类型、尺寸、色彩模式）
2. 主体内容识别与描述
3. 场景/环境分析
4. 情感/氛围感知
5. 构图与视觉元素分析
6. 文本内容提取（如有）
7. 技术质量评估（清晰度、曝光、噪点等）
以结构化、信息密集的格式输出分析结果。`,

  video_analysis: `你是一个专业的视频内容分析专家。对输入的视频进行关键帧抽取和动态场景分析。
输出要求：
1. 视频基本信息（时长、分辨率、帧率估算）
2. 关键帧时间轴与内容描述
3. 场景切换点识别
4. 动态事件捕获与时间线
5. 核心要点与摘要
6. 音频/语音内容概述（如有）
以结构化的时间线报告格式输出。`,
};

// ---- 工具特定的默认提示词 ----
const DEFAULT_PROMPTS: Record<VisionCapability, string> = {
  ui_to_artifact: '请分析这张 UI 截图，并输出对应的实现。',
  ocr: '请提取图片中的所有文本内容，保持原始排版结构。',
  ui_diff_check: '请对比这两张图片的差异，输出详细的视觉偏差报告。',
  image_analysis: '请对这张图片进行全面分析。',
  video_analysis: '请分析这段视频的关键内容和动态场景。',
};

// ---- 图片校验 ----
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 8 * 1024 * 1024;  // 8MB

function validateImageInput(input: string | undefined, maxSize: number, label: string): void {
  if (!input) throw new VisionError(`${label} 为必填参数`, 400);

  // HTTP(S) URL — 不做本地大小校验
  if (/^https?:\/\//i.test(input)) return;

  // Base64 data URL
  if (!input.startsWith('data:')) {
    throw new VisionError(`${label} 格式无效，仅支持 Base64 data URL 或 HTTP(S) URL`, 400);
  }

  // 粗略大小估算：Base64 编码约膨胀 33%
  const base64Data = input.includes(',') ? input.split(',')[1] : input;
  const estimatedBytes = Math.ceil(base64Data.length * 0.75);
  if (estimatedBytes > maxSize) {
    const limitMB = Math.round(maxSize / (1024 * 1024));
    throw new VisionError(`${label} 体积过大，限制 ≤${limitMB}MB`, 413);
  }
}

// ---- 模型解析 ----
function resolveVisionModel(modelId?: string): { modelDbId: string; modelConfig: AiModel } {
  const settings = getSettings();

  if (modelId) {
    const model = settings.models.find((m) => m.id === modelId);
    if (!model) throw new VisionError(`模型 ${modelId} 不存在`, 404);
    if (!model.supportsVision) throw new VisionError(`模型 ${model.displayName} 不支持视觉能力`, 400);
    return { modelDbId: model.id, modelConfig: model };
  }

  // 自动选取首个支持视觉的模型
  const visionModel = settings.models.find((m) => m.supportsVision);
  if (!visionModel) throw new VisionError('没有可用的视觉模型，请先在设置中注册支持视觉的模型', 400);

  return { modelDbId: visionModel.id, modelConfig: visionModel };
}

// ---- 构建用户消息 ----
type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string };

function buildUserContent(
  tool: VisionCapability,
  params: VisionRequest,
): UserContentPart[] {
  const defaultPrompt = DEFAULT_PROMPTS[tool];
  const customPrompt = params.prompt || defaultPrompt;

  const userContent: UserContentPart[] = [];

  if (tool === 'ui_diff_check') {
    // 两张图对比
    if (params.baseImage) {
      userContent.push({ type: 'image' as const, image: params.baseImage });
    }
    if (params.compareImage) {
      userContent.push({ type: 'image' as const, image: params.compareImage });
    }
    userContent.push({ type: 'text' as const, text: `${customPrompt}\n\n第一张为设计基准图，第二张为实现对比图。` });
  } else if (tool === 'video_analysis') {
    // 视频用 text 传递信息（当前 AI SDK 多模态对视频支持有限，用 URL 传递）
    userContent.push({
      type: 'text' as const,
      text: `${customPrompt}\n\n视频文件: ${params.videoFile}`,
    });
  } else if (tool === 'ui_to_artifact') {
    if (params.image) userContent.push({ type: 'image' as const, image: params.image });
    const typeHint = params.type ? `\n\n目标输出类型: ${params.type}` : '';
    userContent.push({ type: 'text' as const, text: customPrompt + typeHint });
  } else {
    // ocr, image_analysis
    if (params.image) userContent.push({ type: 'image' as const, image: params.image });
    userContent.push({ type: 'text' as const, text: customPrompt });
  }

  return userContent;
}

// ---- 主处理函数 ----
export async function handleVision(params: VisionRequest): Promise<VisionResponse> {
  const { tool } = params;

  // 参数校验
  if (tool === 'ui_diff_check') {
    validateImageInput(params.baseImage, MAX_IMAGE_SIZE, 'base_image');
    validateImageInput(params.compareImage, MAX_IMAGE_SIZE, 'compare_image');
  } else if (tool === 'video_analysis') {
    if (!params.videoFile) throw new VisionError('video_file 为必填参数', 400);
    if (params.videoFile.startsWith('data:')) {
      validateImageInput(params.videoFile, MAX_VIDEO_SIZE, 'video_file');
    }
  } else {
    validateImageInput(params.image, MAX_IMAGE_SIZE, 'image');
  }

  // 模型解析
  const { modelDbId, modelConfig } = resolveVisionModel(params.modelId);
  const { provider, modelId } = resolveClient(modelDbId);

  // 构建内容
  const systemPrompt = SYSTEM_PROMPTS[tool];
  const userContent = buildUserContent(tool, params);

  // 调用 AI SDK
  try {
    const result = await generateText({
      model: provider.chat(modelId) as Parameters<typeof generateText>[0]['model'],
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContent },
      ] as Array<{ role: 'user'; content: UserContentPart[] }>,
      maxOutputTokens: 4096,
    });

    return {
      text: result.text,
      modelUsed: modelConfig.displayName || modelConfig.modelId,
      finishReason: result.finishReason,
    };
  } catch (err) {
    if (err instanceof VisionError) throw err;
    if (err instanceof Error) {
      throw new VisionError(`AI 模型调用失败: ${err.message}`, 502);
    }
    throw err;
  }
}
