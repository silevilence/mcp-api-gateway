// ============================================================
// 视觉智能页面 · 管理视觉原子能力节点
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { layout } from '../styles.js';
import { VISION_CAPABILITIES, createVisionNodeTemplate } from '@shared/types.js';
import { nodesApi } from '../apiClient.js';
import { useToast } from '../components/Toast.js';
import type { ApiNode, ApiProject, AiModel, VisionCapabilityMeta } from '@shared/types.js';

interface VisionPageProps {
  project: ApiProject;
  onBack: () => void;
}

export const VisionPage: React.FC<VisionPageProps> = ({ project, onBack }) => {
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [visionModels, setVisionModels] = useState<AiModel[]>([]);
  const { showToast } = useToast();

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
    </div>
  );
};
