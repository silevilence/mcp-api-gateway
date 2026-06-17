// ============================================================
// 视觉智能页面 · 管理视觉原子能力节点
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { layout } from '../styles.js';
import { VISION_CAPABILITIES, createVisionNodeTemplate } from '@shared/types.js';
import { nodesApi } from '../apiClient.js';
import { useToast } from '../components/Toast.js';
import { MediaInput } from '../components/MediaInput.js';
import type { ApiNode, ApiProject, AiModel, VisionCapabilityMeta } from '@shared/types.js';

interface VisionPageProps {
  project: ApiProject;
  onBack: () => void;
}

interface DebugFormState {
  image: string;
  prompt: string;
  stream: boolean;
  type: string;
  baseImage: string;
  compareImage: string;
  videoFile: string;
  modelId: string;
}

export const VisionPage: React.FC<VisionPageProps> = ({ project, onBack }) => {
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [visionModels, setVisionModels] = useState<AiModel[]>([]);
  const { showToast } = useToast();
  
  // 调试状态
  const [debuggingCap, setDebuggingCap] = useState<VisionCapabilityMeta | null>(null);
  const [debugResult, setDebugResult] = useState<string | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugForm, setDebugForm] = useState<DebugFormState>({
    image: '', prompt: '', stream: false, type: '',
    baseImage: '', compareImage: '', videoFile: '', modelId: '',
  });

  const getDebugNode = useCallback((): ApiNode | undefined => {
    if (!debuggingCap) return undefined;
    return nodes.find((n) => n.slug === debuggingCap.id);
  }, [debuggingCap, nodes]);

  // 加载节点 + 视觉模型列表
  const fetchData = useCallback(async () => {
    try {
      const [nodesRes, settingsRes] = await Promise.all([
        nodesApi.list(project.id),
        fetch('/api/settings').then((r) => r.json()),
      ]);
      if (nodesRes.code === 0) setNodes(nodesRes.data);
      if (settingsRes.code === 0) {
        const models = (settingsRes.data.models as AiModel[]).filter((m) => m.supportsVision);
        setVisionModels(models);
      }
    } catch {
      showToast('加载数据失败', 'error');
    }
  }, [project.id, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const existingIds = new Set(nodes.map((n) => n.slug));
  const enabledSlugs = new Set(nodes.filter((n) => n.mcpToolEnabled && !n.hidden).map((n) => n.slug));

  const handleAddCapability = async (cap: VisionCapabilityMeta) => {
    const template = createVisionNodeTemplate(cap, project.id);
    const res = await nodesApi.create(template as never);
    if (res.code === 0) {
      showToast(`能力「${cap.name}」已添加`, 'success');
      fetchData();
    } else {
      showToast(res.message || '添加失败', 'error');
    }
  };

  const handleToggleMcp = async (node: ApiNode) => {
    const res = await nodesApi.update(node.id, { mcpToolEnabled: !node.mcpToolEnabled } as never);
    if (res.code === 0) {
      showToast(node.mcpToolEnabled ? '已关闭 MCP Tool' : '已启用 MCP Tool', 'success');
      fetchData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleSetModel = async (node: ApiNode, modelId: string | null) => {
    const res = await nodesApi.update(node.id, { boundModelId: modelId } as never);
    if (res.code === 0) {
      showToast(modelId ? '模型绑定成功' : '已清除模型绑定', 'success');
      fetchData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDelete = async (nodeId: string) => {
    const res = await nodesApi.delete(nodeId);
    if (res.code === 0) {
      showToast('能力节点已删除', 'success');
      fetchData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // ---- 调试操作 ----
  const handleOpenDebug = (cap: VisionCapabilityMeta) => {
    setDebuggingCap(cap);
    setDebugForm({
      image: '', prompt: '', stream: false, type: '',
      baseImage: '', compareImage: '', videoFile: '', modelId: '',
    });
    setDebugResult(null);
  };

  const handleSendDebug = async () => {
    if (!debuggingCap) return;
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const body: Record<string, unknown> = {};
      const node = getDebugNode();
      if (debugForm.prompt) body.prompt = debugForm.prompt;
      if (debugForm.stream) body.stream = true;
      if (node?.boundModelId) body.modelId = node.boundModelId;

      switch (debuggingCap.id) {
        case 'ui_to_artifact':
          body.image = debugForm.image || undefined;
          body.type = debugForm.type || undefined;
          break;
        case 'ocr':
          body.image = debugForm.image || undefined;
          break;
        case 'ui_diff_check':
          body.baseImage = debugForm.baseImage || undefined;
          body.compareImage = debugForm.compareImage || undefined;
          break;
        case 'image_analysis':
          body.image = debugForm.image || undefined;
          break;
        case 'video_analysis':
          body.videoFile = debugForm.videoFile || undefined;
          break;
      }

      const res = await fetch(`/api/vision/${debuggingCap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code === 0) {
        const data = json.data;
        setDebugResult(`${data.text}\n\n---\n模型: ${data.modelUsed}${data.finishReason ? ` · 结束原因: ${data.finishReason}` : ''}`);
      } else {
        setDebugResult(`错误 [${json.code}]: ${json.message}`);
      }
    } catch (err: unknown) {
      setDebugResult(`网络错误: ${(err as Error).message}`);
    } finally {
      setDebugLoading(false);
    }
  };

  return (
    <div>
      <div style={layout.cardHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ ...layout.btn, fontSize: 13 }} onClick={onBack}>
              ← 返回
            </button>
            <h1 style={{ ...layout.pageTitle, margin: 0 }}>👁 {project.name}</h1>
          </div>
          <p style={{ ...layout.pageSubtitle, marginTop: 4 }}>
            图像理解 (Vision Intelligence) · 共 {nodes.length} / {VISION_CAPABILITIES.length} 个能力已添加
            {visionModels.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                · {visionModels.length} 个视觉模型可用
              </span>
            )}
          </p>
        </div>
      </div>

      {visionModels.length === 0 && (
        <div style={{ ...layout.card, marginBottom: 16, padding: 16, borderLeft: '3px solid var(--warning)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            ⚠️ 尚未配置任何视觉模型。请先前往
            <button style={{ ...layout.btn, fontSize: 12, margin: '0 4px', display: 'inline', padding: '2px 8px' }} onClick={() => window.location.href = '/?settings'}>
              全局设置
            </button>
            添加支持视觉能力的 AI 模型。
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {VISION_CAPABILITIES.map((cap) => {
          const isAdded = existingIds.has(cap.id);
          const node = nodes.find((n) => n.slug === cap.id);
          const isMcpEnabled = node ? enabledSlugs.has(cap.id) && !node.hidden : false;

          return (
            <div
              key={cap.id}
              style={{
                ...layout.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: isAdded ? 1 : 0.7,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{cap.name}</span>
                  <span style={{ ...layout.badge, ...layout.badgePurple, fontSize: 10 }}>{cap.id}</span>
                  {isAdded && (
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 4, background: 'var(--success-soft)', color: 'var(--success)' }}>
                      已添加
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {cap.description}
                </p>
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {cap.params.map((p) => (
                    <span key={p.key} style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'var(--bg-input)',
                      color: p.required ? 'var(--accent)' : 'var(--text-muted)',
                      border: `1px solid var(--border-muted)`,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {p.key}{p.required ? '*' : '?'}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginLeft: 16, alignItems: 'center' }}>
                {isAdded && node ? (
                  <>
                    {/* 模型选择 */}
                    <select
                      style={{ ...layout.select, fontSize: 12, width: 'auto', maxWidth: 180 }}
                      value={node.boundModelId ?? ''}
                      onChange={(e) => handleSetModel(node, e.target.value || null)}
                    >
                      <option value="">自动选择</option>
                      {visionModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName || m.modelId}
                        </option>
                      ))}
                    </select>
                    <button
                      style={{ ...layout.btn, fontSize: 12, color: 'var(--accent)', borderColor: 'var(--accent)' }}
                      onClick={() => handleOpenDebug(cap)}
                    >
                      调试
                    </button>
                    <button
                      style={{
                        ...layout.btn,
                        fontSize: 12,
                        background: isMcpEnabled ? 'var(--success-soft)' : 'transparent',
                        color: isMcpEnabled ? 'var(--success)' : 'var(--text-secondary)',
                        borderColor: isMcpEnabled ? 'var(--success)' : 'var(--border-default)',
                      }}
                      onClick={() => handleToggleMcp(node)}
                    >
                      MCP {isMcpEnabled ? '已启用' : '未启用'}
                    </button>
                    <button
                      style={{ ...layout.btn, fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleDelete(node.id)}
                    >
                      删除
                    </button>
                  </>
                ) : (
                  <button
                    style={{ ...layout.btn, ...layout.btnPrimary, fontSize: 13 }}
                    onClick={() => handleAddCapability(cap)}
                  >
                    + 添加
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- 调试弹窗 ---- */}
      {debuggingCap && createPortal(
        <div style={layout.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setDebuggingCap(null); }}>
          <div style={{ ...layout.modalContent, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700 }}>调试: {debuggingCap.name}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {debuggingCap.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Image input (ocr, image_analysis, ui_to_artifact) */}
              {debuggingCap.params.some((p) => p.key === 'image') && (
                <div style={layout.formGroup}>
                  <label style={layout.label}>图像</label>
                  <MediaInput
                    accept="image/*"
                    value={debugForm.image}
                    onChange={(v) => setDebugForm((prev) => ({ ...prev, image: v }))}
                  />
                </div>
              )}
              {/* baseImage + compareImage (ui_diff_check) */}
              {debuggingCap.id === 'ui_diff_check' && (
                <>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>基准图 (baseImage)</label>
                    <MediaInput
                      accept="image/*"
                      value={debugForm.baseImage}
                      onChange={(v) => setDebugForm((prev) => ({ ...prev, baseImage: v }))}
                    />
                  </div>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>对比图 (compareImage)</label>
                    <MediaInput
                      accept="image/*"
                      value={debugForm.compareImage}
                      onChange={(v) => setDebugForm((prev) => ({ ...prev, compareImage: v }))}
                    />
                  </div>
                </>
              )}
              {/* videoFile (video_analysis) */}
              {debuggingCap.id === 'video_analysis' && (
                <div style={layout.formGroup}>
                  <label style={layout.label}>视频文件</label>
                  <MediaInput
                    accept="video/*"
                    maxSizeMB={8}
                    value={debugForm.videoFile}
                    onChange={(v) => setDebugForm((prev) => ({ ...prev, videoFile: v }))}
                  />
                </div>
              )}
              {/* type (ui_to_artifact) */}
              {debuggingCap.id === 'ui_to_artifact' && (
                <div style={layout.formGroup}>
                  <label style={layout.label}>输出类型 (type)</label>
                  <select
                    style={layout.select}
                    value={debugForm.type}
                    onChange={(e) => setDebugForm((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="">自动</option>
                    <option value="Code">Code (前端代码)</option>
                    <option value="Prompt">Prompt (绘图提示词)</option>
                    <option value="Spec">Spec (设计规范)</option>
                    <option value="Description">Description (自然语言描述)</option>
                  </select>
                </div>
              )}
              {/* prompt */}
              <div style={layout.formGroup}>
                <label style={layout.label}>提示词 (prompt，可选)</label>
                <textarea
                  style={{ ...layout.textarea, minHeight: 50, fontSize: 13 }}
                  value={debugForm.prompt}
                  onChange={(e) => setDebugForm((prev) => ({ ...prev, prompt: e.target.value }))}
                  placeholder="留空则使用场景默认提示词"
                />
              </div>
              {/* stream checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={debugForm.stream}
                    onChange={(e) => setDebugForm((prev) => ({ ...prev, stream: e.target.checked }))}
                  />
                  流式响应
                </label>
                {/* 显示绑定模型 */}
                {getDebugNode()?.boundModelId && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    绑定模型: {visionModels.find((m) => m.id === getDebugNode()?.boundModelId)?.displayName ?? getDebugNode()?.boundModelId}
                  </span>
                )}
              </div>
            </div>

            {/* 发送按钮 */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" style={layout.btn} onClick={() => setDebuggingCap(null)}>关闭</button>
              <button
                type="button"
                style={{ ...layout.btn, ...layout.btnPrimary }}
                onClick={handleSendDebug}
                disabled={debugLoading}
              >
                {debugLoading ? '处理中…' : '▶ 发送'}
              </button>
            </div>

            {/* 结果展示 */}
            {debugResult !== null && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                maxHeight: 400,
                overflow: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                color: debugResult.startsWith('错误') || debugResult.startsWith('网络错误')
                  ? 'var(--danger)' : 'var(--text-primary)',
              }}>
                {debugLoading ? '等待响应…' : debugResult}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
