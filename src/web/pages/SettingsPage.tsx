// ============================================================
// 全局设置页面 · 供应商 + 模型管理
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { layout } from '../styles.js';
import { useToast } from '../components/Toast.js';
import type { AiProvider, AiModel, GlobalSettings, ProviderType } from '@shared/types.js';

// ---- 类型 ----
interface ProviderFormData {
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

interface ModelFormData {
  providerId: string;
  modelId: string;
  displayName: string;
  supportsVision: boolean;
  supportsThinking: boolean;
}

const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com/v1',
  ollama: 'http://localhost:11434/v1',
};

const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: 'OpenAI',
  google: 'Google Gemini',
  anthropic: 'Anthropic Claude',
  ollama: 'Ollama',
};

// ---- API 辅助 ----
async function fetchSettings(): Promise<GlobalSettings> {
  const res = await fetch('/api/settings');
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

async function saveSettings(patch: Partial<GlobalSettings>): Promise<GlobalSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

// ---- 组件 ----
export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>({ providers: [], models: [] });
  const [loading, setLoading] = useState(true);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const { showToast } = useToast();

  const [providerForm, setProviderForm] = useState<ProviderFormData>({
    name: '', type: 'openai', baseUrl: '', apiKey: '', enabled: true,
  });
  const [modelForm, setModelForm] = useState<ModelFormData>({
    providerId: '', modelId: '', displayName: '', supportsVision: false, supportsThinking: false,
  });

  // ---- 模型发现状态 ----
  const [showFetchModels, setShowFetchModels] = useState(false);
  const [fetchingProviderId, setFetchingProviderId] = useState<string>('');
  const [discoveredModels, setDiscoveredModels] = useState<Array<{ id: string; owned_by?: string; alreadyAdded: boolean }>>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [fetchingModels, setFetchingModels] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch {
      showToast('加载设置失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // ---- 供应商操作 ----
  const openNewProvider = () => {
    setEditingProviderId(null);
    setProviderForm({ name: '', type: 'openai', baseUrl: DEFAULT_BASE_URLS.openai, apiKey: '', enabled: true });
    setShowProviderForm(true);
  };

  const openEditProvider = (p: AiProvider) => {
    setEditingProviderId(p.id);
    setProviderForm({ name: p.name, type: p.type, baseUrl: p.baseUrl, apiKey: '', enabled: p.enabled });
    setShowProviderForm(true);
  };

  const saveProvider = async () => {
    try {
      const now = new Date().toISOString();
      const isEdit = !!editingProviderId;
      const provider: AiProvider = {
        id: isEdit ? editingProviderId! : crypto.randomUUID(),
        name: providerForm.name.trim() || PROVIDER_LABELS[providerForm.type],
        type: providerForm.type,
        baseUrl: providerForm.baseUrl.trim() || DEFAULT_BASE_URLS[providerForm.type],
        apiKey: providerForm.apiKey.trim() || 'sk-****',
        enabled: providerForm.enabled,
        createdAt: isEdit ? (settings.providers.find((p) => p.id === editingProviderId)?.createdAt ?? now) : now,
        updatedAt: now,
      };

      const providers = isEdit
        ? settings.providers.map((p) => (p.id === editingProviderId ? provider : p))
        : [...settings.providers, provider];

      await saveSettings({ providers });
      showToast(isEdit ? '供应商更新成功' : '供应商添加成功', 'success');
      setShowProviderForm(false);
      loadSettings();
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      const providers = settings.providers.filter((p) => p.id !== id);
      const models = settings.models.filter((m) => m.providerId !== id);
      await saveSettings({ providers, models });
      showToast('供应商已删除', 'success');
      loadSettings();
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  // ---- 模型操作 ----
  const openNewModel = () => {
    setEditingModelId(null);
    setModelForm({ providerId: settings.providers[0]?.id ?? '', modelId: '', displayName: '', supportsVision: false, supportsThinking: false });
    setShowModelForm(true);
  };

  const openEditModel = (m: AiModel) => {
    setEditingModelId(m.id);
    setModelForm({ providerId: m.providerId, modelId: m.modelId, displayName: m.displayName, supportsVision: m.supportsVision, supportsThinking: m.supportsThinking });
    setShowModelForm(true);
  };

  const saveModel = async () => {
    try {
      const now = new Date().toISOString();
      const isEdit = !!editingModelId;
      const model: AiModel = {
        id: isEdit ? editingModelId! : crypto.randomUUID(),
        providerId: modelForm.providerId,
        modelId: modelForm.modelId.trim(),
        displayName: modelForm.displayName.trim() || modelForm.modelId.trim(),
        supportsVision: modelForm.supportsVision,
        supportsThinking: modelForm.supportsThinking,
        createdAt: isEdit ? (settings.models.find((m) => m.id === editingModelId)?.createdAt ?? now) : now,
        updatedAt: now,
      };

      if (!model.providerId || !model.modelId) {
        showToast('供应商和 Model ID 为必填项', 'error');
        return;
      }

      const models = isEdit
        ? settings.models.map((m) => (m.id === editingModelId ? model : m))
        : [...settings.models, model];

      await saveSettings({ models });
      showToast(isEdit ? '模型更新成功' : '模型添加成功', 'success');
      setShowModelForm(false);
      loadSettings();
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  const deleteModel = async (id: string) => {
    try {
      const models = settings.models.filter((m) => m.id !== id);
      await saveSettings({ models });
      showToast('模型已删除', 'success');
      loadSettings();
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  // ---- 模型发现 ----
  const openFetchModels = (providerId: string) => {
    setFetchingProviderId(providerId);
    setDiscoveredModels([]);
    setSelectedModelIds(new Set());
    setShowFetchModels(true);
    fetchProviderModels(providerId);
  };

  const fetchProviderModels = async (providerId: string) => {
    setFetchingModels(true);
    try {
      const res = await fetch(`/api/settings/providers/${providerId}/models/fetch`);
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message);
      setDiscoveredModels(json.data);
    } catch (err: unknown) {
      showToast((err as Error).message || '获取模型列表失败', 'error');
    } finally {
      setFetchingModels(false);
    }
  };

  const toggleModelSelection = (modelId: string) => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  };

  const selectAllModels = () => {
    const notAdded = discoveredModels.filter((m) => !m.alreadyAdded);
    setSelectedModelIds(new Set(notAdded.map((m) => m.id)));
  };

  const deselectAllModels = () => {
    setSelectedModelIds(new Set());
  };

  const addSelectedModels = async () => {
    if (selectedModelIds.size === 0) {
      showToast('请至少选择一个模型', 'error');
      return;
    }
    try {
      const now = new Date().toISOString();
      const newModels: AiModel[] = [];
      for (const id of selectedModelIds) {
        const discovered = discoveredModels.find((m) => m.id === id);
        if (discovered && !discovered.alreadyAdded) {
          newModels.push({
            id: crypto.randomUUID(),
            providerId: fetchingProviderId,
            modelId: discovered.id,
            displayName: discovered.owned_by ? `${discovered.owned_by} / ${discovered.id}` : discovered.id,
            supportsVision: false,
            supportsThinking: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const models = [...settings.models, ...newModels];
      await saveSettings({ models });
      showToast(`已添加 ${newModels.length} 个模型`, 'success');
      setShowFetchModels(false);
      loadSettings();
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  // ---- 渲染 ----
  const providerTypeBadge = (type: ProviderType) => {
    const colors: Record<ProviderType, React.CSSProperties> = {
      openai: { background: 'var(--success-soft)', color: 'var(--success)' },
      google: { background: 'var(--warning-soft)', color: 'var(--warning)' },
      anthropic: { background: 'var(--purple-soft)', color: 'var(--purple)' },
      ollama: { background: 'var(--accent-soft)', color: 'var(--accent)' },
    };
    return (
      <span style={{ ...layout.badge, ...colors[type], fontSize: 11 }}>
        {type}
      </span>
    );
  };

  return (
    <div>
      <div style={layout.cardHeader}>
        <div>
          <h1 style={layout.pageTitle}>⚙️ 全局设置</h1>
          <p style={layout.pageSubtitle}>管理 AI 供应商网关与模型资产清单</p>
        </div>
      </div>

      {loading ? (
        <div style={layout.emptyState}>
          <div className="skeleton" style={{ width: '60%', height: 20, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: '40%', height: 16, margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {/* ---- 供应商管理 ---- */}
          <div style={{ ...layout.card, marginBottom: 24 }}>
            <div style={{ ...layout.cardHeader, borderBottom: '1px solid var(--border-default)', paddingBottom: 16, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>供应商网关</h2>
              <button style={{ ...layout.btn, ...layout.btnPrimary, fontSize: 13 }} onClick={openNewProvider}>
                + 添加供应商
              </button>
            </div>

            {settings.providers.length === 0 ? (
              <div style={{ ...layout.emptyState, padding: '24px 0' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>尚未配置任何 AI 供应商</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  点击「添加供应商」开始配置 OpenAI、Gemini、Claude 或 Ollama
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {settings.providers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                          {providerTypeBadge(p.type)}
                          <span style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: p.enabled ? 'var(--success-soft)' : 'var(--danger-soft)',
                            color: p.enabled ? 'var(--success)' : 'var(--danger)',
                          }}>
                            {p.enabled ? '已启用' : '已禁用'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {p.apiKey} · {p.baseUrl}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ ...layout.btn, fontSize: 12 }} onClick={() => openEditProvider(p)}>
                        编辑
                      </button>
                      <button
                        style={{ ...layout.btn, fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={() => deleteProvider(p.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---- 模型清单 ---- */}
          <div style={layout.card}>
            <div style={{ ...layout.cardHeader, borderBottom: '1px solid var(--border-default)', paddingBottom: 16, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>模型清单</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...layout.btn, fontSize: 13 }} onClick={() => {
                  const pid = settings.providers[0]?.id;
                  if (pid) openFetchModels(pid);
                  else showToast('请先添加供应商', 'error');
                }}>
                  从供应商拉取
                </button>
                <button style={{ ...layout.btn, ...layout.btnPrimary, fontSize: 13 }} onClick={openNewModel}>
                  + 手动添加
                </button>
              </div>
            </div>

            {settings.providers.map((provider) => {
              const models = settings.models.filter((m) => m.providerId === provider.id);
              return (
                <div key={provider.id} style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {provider.name} 旗下
                  </h3>
                  {models.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                      暂无模型，点击「手动添加」注册
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {models.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            background: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid var(--border-muted)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 500, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                              {m.modelId}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                              {m.displayName !== m.modelId ? m.displayName : ''}
                            </span>
                            <span style={{ display: 'flex', gap: 4 }}>
                              {m.supportsVision && (
                                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                  👁 视觉
                                </span>
                              )}
                              {m.supportsThinking && (
                                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--purple-soft)', color: 'var(--purple)' }}>
                                  🧠 思维链
                                </span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...layout.btn, fontSize: 11 }} onClick={() => openEditModel(m)}>
                              编辑
                            </button>
                            <button
                              style={{ ...layout.btn, fontSize: 11, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                              onClick={() => deleteModel(m.id)}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {settings.providers.length === 0 && (
              <div style={{ ...layout.emptyState, padding: '24px 0' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>请先添加供应商</p>
              </div>
            )}
          </div>

          {/* ---- 供应商编辑弹窗 ---- */}
          {showProviderForm && (
            <div style={layout.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setShowProviderForm(false); }}>
              <div style={layout.modalContent} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700 }}>
                  {editingProviderId ? '编辑供应商' : '添加供应商'}
                </h3>
                <form onSubmit={(e) => { e.preventDefault(); saveProvider(); }}>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>供应商类型</label>
                    <select
                      style={layout.select}
                      value={providerForm.type}
                      onChange={(e) => {
                        const t = e.target.value as ProviderType;
                        setProviderForm((prev) => ({ ...prev, type: t, baseUrl: DEFAULT_BASE_URLS[t] }));
                      }}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="google">Google Gemini</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="ollama">Ollama</option>
                    </select>
                  </div>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>名称</label>
                    <input
                      style={layout.input}
                      value={providerForm.name}
                      onChange={(e) => setProviderForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder={PROVIDER_LABELS[providerForm.type]}
                    />
                  </div>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>Base URL</label>
                    <input
                      style={layout.input}
                      value={providerForm.baseUrl}
                      onChange={(e) => setProviderForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder={DEFAULT_BASE_URLS[providerForm.type]}
                    />
                  </div>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>
                      API Key
                      {editingProviderId && <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>留空则不修改</span>}
                    </label>
                    <input
                      style={layout.input}
                      type="password"
                      value={providerForm.apiKey}
                      onChange={(e) => setProviderForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder={editingProviderId ? '留空不修改…' : 'sk-...'}
                    />
                  </div>
                  <div style={{ ...layout.formGroup, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ ...layout.label, margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={providerForm.enabled}
                        onChange={(e) => setProviderForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                        style={{ marginRight: 6 }}
                      />
                      启用
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button type="button" style={layout.btn} onClick={() => setShowProviderForm(false)}>
                      取消
                    </button>
                    <button type="submit" style={{ ...layout.btn, ...layout.btnPrimary }}>
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ---- 模型编辑弹窗 ---- */}
          {showModelForm && (
            <div style={layout.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModelForm(false); }}>
              <div style={layout.modalContent} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700 }}>
                  {editingModelId ? '编辑模型' : '添加模型'}
                </h3>
                <form onSubmit={(e) => { e.preventDefault(); saveModel(); }}>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>供应商</label>
                    <select
                      style={layout.select}
                      value={modelForm.providerId}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, providerId: e.target.value }))}
                    >
                      {settings.providers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                      ))}
                    </select>
                  </div>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>Model ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      style={layout.input}
                      value={modelForm.modelId}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, modelId: e.target.value, displayName: prev.displayName || e.target.value }))}
                      placeholder="如 gpt-4o, claude-sonnet-4-20250514"
                    />
                  </div>
                  <div style={layout.formGroup}>
                    <label style={layout.label}>显示名</label>
                    <input
                      style={layout.input}
                      value={modelForm.displayName}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      placeholder="自动使用 Model ID"
                    />
                  </div>
                  <div style={{ ...layout.formGroup, display: 'flex', gap: 20 }}>
                    <label style={{ ...layout.label, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={modelForm.supportsVision}
                        onChange={(e) => setModelForm((prev) => ({ ...prev, supportsVision: e.target.checked }))}
                      />
                      👁 支持视觉
                    </label>
                    <label style={{ ...layout.label, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={modelForm.supportsThinking}
                        onChange={(e) => setModelForm((prev) => ({ ...prev, supportsThinking: e.target.checked }))}
                      />
                      🧠 支持思维链
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button type="button" style={layout.btn} onClick={() => setShowModelForm(false)}>
                      取消
                    </button>
                    <button type="submit" style={{ ...layout.btn, ...layout.btnPrimary }}>
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ---- 模型拉取弹窗 ---- */}
          {showFetchModels && (
            <div style={layout.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setShowFetchModels(false); }}>
              <div style={{ ...layout.modalContent, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700 }}>从供应商拉取模型</h3>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>供应商：</span>
                  <select
                    style={{ ...layout.select, width: 'auto', flex: 1 }}
                    value={fetchingProviderId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setFetchingProviderId(pid);
                      fetchProviderModels(pid);
                    }}
                  >
                    {settings.providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                    ))}
                  </select>
                </div>

                {fetchingModels ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div className="skeleton" style={{ width: '60%', height: 16, margin: '0 auto 8px' }} />
                    <div className="skeleton" style={{ width: '40%', height: 14, margin: '0 auto' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>正在从供应商拉取模型列表…</p>
                  </div>
                ) : discoveredModels.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: 14 }}>未获取到模型，请检查供应商配置</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <button style={{ ...layout.btn, fontSize: 12 }} onClick={selectAllModels}>全选</button>
                      <button style={{ ...layout.btn, fontSize: 12 }} onClick={deselectAllModels}>取消全选</button>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                        已选 {selectedModelIds.size} / {discoveredModels.filter((m) => !m.alreadyAdded).length} 个新模型
                      </span>
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {discoveredModels.map((m) => (
                        <label
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: selectedModelIds.has(m.id) ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                            border: `1px solid ${selectedModelIds.has(m.id) ? 'var(--accent)' : 'var(--border-muted)'}`,
                            cursor: m.alreadyAdded ? 'default' : 'pointer',
                            opacity: m.alreadyAdded ? 0.5 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedModelIds.has(m.id)}
                            disabled={m.alreadyAdded}
                            onChange={() => toggleModelSelection(m.id)}
                          />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>{m.id}</span>
                          {m.owned_by && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.owned_by}</span>
                          )}
                          {m.alreadyAdded && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--success)', background: 'var(--success-soft)', padding: '1px 8px', borderRadius: 4 }}>
                              已添加
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button type="button" style={layout.btn} onClick={() => setShowFetchModels(false)}>取消</button>
                  <button
                    type="button"
                    style={{ ...layout.btn, ...layout.btnPrimary }}
                    onClick={addSelectedModels}
                    disabled={selectedModelIds.size === 0 || fetchingModels}
                  >
                    添加选中 ({selectedModelIds.size})
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
