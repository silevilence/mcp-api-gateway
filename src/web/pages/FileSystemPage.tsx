// ============================================================
// 文件系统项目视图 · 节点管理模式
// 先选择添加能力节点，再通过调试面板执行，未添加的接口不暴露 MCP
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { layout } from '../styles.js';
import { nodesApi, apiNodes } from '../apiClient.js';
import { SandboxPanel } from '../components/SandboxPanel.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { useToast } from '../components/Toast.js';
import { FILE_SYSTEM_CAPABILITIES, createFileSystemNodeTemplate } from '@shared/types.js';
import type { ApiProject, ApiNode, FileSystemCapabilityMeta } from '@shared/types.js';

interface FileSystemPageProps {
  project: ApiProject;
  onBack: () => void;
}

export const FileSystemPage: React.FC<FileSystemPageProps> = ({ project, onBack }) => {
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [debuggingNodeId, setDebuggingNodeId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  // 已经添加的能力 ID 集合
  const addedCapIds = new Set(nodes.map((n) => n.slug));
  // 未添加的能力列表
  const availableCaps = FILE_SYSTEM_CAPABILITIES.filter((c) => !addedCapIds.has(c.id));

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nodesApi.list(project.id);
      if (res.code === 0) setNodes(res.data);
    } catch {
      showToast('加载能力节点列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [project.id, showToast]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  const visibleNodes = nodes.filter((n) => showHidden || !n.hidden);
  const hiddenCount = nodes.filter((n) => n.hidden).length;

  // 添加能力节点
  const handleAddCapability = async (cap: FileSystemCapabilityMeta) => {
    const template = createFileSystemNodeTemplate(cap, project.id);
    const res = await nodesApi.create(template as never);
    if (res.code === 0) {
      showToast(`能力「${cap.name}」已添加`, 'success');
      fetchNodes();
    } else {
      showToast(res.message || '添加失败', 'error');
    }
  };

  // 删除节点
  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await nodesApi.delete(deletingId);
    if (res.code === 0) {
      showToast('能力节点已删除', 'success');
      setDeletingId(null);
      fetchNodes();
    } else {
      showToast(res.message, 'error');
    }
  };

  // 归档/反归档
  const handleArchive = async (id: string) => {
    const res = await nodesApi.archive(id);
    if (res.code === 0) {
      showToast('节点已归档', 'success');
      fetchNodes();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleUnarchive = async (id: string) => {
    const res = await nodesApi.unarchive(id);
    if (res.code === 0) {
      showToast('节点已取消归档', 'success');
      fetchNodes();
    } else {
      showToast(res.message, 'error');
    }
  };

  // 批量选择
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleNodes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleNodes.map((n) => n.id)));
    }
  };

  const handleBatchMcpRegister = async (enabled: boolean) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const res = await apiNodes.batchMcpRegister(ids, enabled);
    if (res.code === 0) {
      const r = res.data as { registered: number; failed: Array<{ nodeId: string; reason: string }> };
      showToast(
        `${enabled ? '注册' : '取消注册'}成功：${r.registered} 个${r.failed.length > 0 ? `，失败 ${r.failed.length} 个` : ''}`,
        r.failed.length > 0 ? 'error' : 'success',
      );
      setSelectedIds(new Set());
      fetchNodes();
    } else {
      showToast(res.message, 'error');
    }
  };

  const sourceBadge = (source: string) =>
    source === 'filesystem'
      ? { ...layout.badge, ...layout.badgeAmber, children: '文件系统' }
      : { ...layout.badge, ...layout.badgeGreen, children: '自定义' };

  return (
    <div>
      {/* 页头 */}
      <div style={layout.cardHeader}>
        <div style={layout.flexRow}>
          <button style={{ ...layout.btn, ...layout.btnSmall }} onClick={onBack}>
            ← 返回
          </button>
          <div>
            <h1 style={{ ...layout.pageTitle, fontSize: 22, marginBottom: 0 }}>
              {project.name}
            </h1>
            <span style={layout.textSecondary}>
              文件系统 · {project.workspaceRoot || '未配置工作区根目录'} · {visibleNodes.length} 个活跃{hiddenCount > 0 ? `，${hiddenCount} 个已归档` : ''}
            </span>
          </div>
        </div>
      </div>

      {project.description && (
        <p style={{ ...layout.textSecondary, marginBottom: 16, marginTop: -12 }}>{project.description}</p>
      )}

      {!project.workspaceRoot && (
        <div style={{
          padding: '16px 20px', background: 'var(--danger-soft)',
          borderRadius: 'var(--radius-md)', marginBottom: 24,
          color: 'var(--danger)', fontSize: 14, border: '1px solid var(--danger)',
          fontWeight: 500,
        }}>
          ⚠ 工作区根目录未配置
          <div style={{ fontWeight: 400, marginTop: 6, fontSize: 13, opacity: 0.85 }}>
            请在项目编辑中配置工作区根路径，否则文件系统操作无法执行。
          </div>
        </div>
      )}

      {/* 可添加的能力列表 */}
      {availableCaps.length > 0 && (
        <div style={{ ...layout.card, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>可添加的原子能力</h3>
          <p style={{ ...layout.textMuted, marginBottom: 16, fontSize: 12 }}>
            选择需要的能力添加到项目中。添加后可在下方管理（配置标识、注册 MCP Tool、调试执行）。
            未添加的能力不会暴露为 MCP 工具。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {availableCaps.map((cap) => (
              <div
                key={cap.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: 14, borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-input)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...layout.flexRow, marginBottom: 4 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: cap.danger ? 'var(--danger)' : 'var(--accent)',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{cap.name}</span>
                    {cap.danger && (
                      <span style={{ ...layout.badge, ...layout.badgeRed, fontSize: 10, padding: '1px 6px' }}>高危</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 4 }}>
                    {cap.description}
                  </p>
                  <code style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{cap.params.filter((p) => p.required).length} 个必填参数</code>
                </div>
                <button
                  style={{ ...layout.btn, ...layout.btnSmall, ...layout.btnPrimary, flexShrink: 0 }}
                  onClick={() => handleAddCapability(cap)}
                  disabled={!project.workspaceRoot}
                  title={!project.workspaceRoot ? '请先配置工作区根目录' : `添加 ${cap.name}`}
                >
                  + 添加
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已添加的能力列表 */}
      <div style={{ ...layout.cardHeader, marginBottom: 12 }}>
        <div style={{ ...layout.flexRow }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>已添加的能力节点</h3>
          <label style={{ ...layout.flexRow, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', gap: 6 }}>
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            显示已归档
          </label>
        </div>
      </div>

      {loading ? (
        <div style={layout.emptyState}>
          <div className="skeleton" style={{ width: '60%', height: 20, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: '40%', height: 16, margin: '0 auto' }} />
        </div>
      ) : visibleNodes.length === 0 ? (
        <div style={{ ...layout.card, ...layout.emptyState }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📁</div>
          <p style={{ marginBottom: 8 }}>暂无能力节点</p>
          <p style={layout.textMuted}>从上方列表中选择需要的能力添加到项目中</p>
        </div>
      ) : (
        <div style={layout.card}>
          {/* 批量操作栏 */}
          {selectedIds.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 16px', background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              borderBottom: '1px solid var(--border)', fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>已选 {selectedIds.size} 项</span>
              <button
                style={{ ...layout.btn, ...layout.btnSmall, background: 'var(--accent)', color: '#fff', border: 'none' }}
                onClick={() => handleBatchMcpRegister(true)}
              >
                ⚡ 注册为 MCP Tool
              </button>
              <button style={{ ...layout.btn, ...layout.btnSmall }} onClick={() => handleBatchMcpRegister(false)}>
                取消注册
              </button>
              <button style={{ ...layout.btn, ...layout.btnSmall }} onClick={() => setSelectedIds(new Set())}>
                取消选择
              </button>
            </div>
          )}
          <table style={layout.table}>
            <thead>
              <tr>
                <th style={{ ...layout.th, width: 36 }}>
                  <input type="checkbox" checked={selectedIds.size === visibleNodes.length && visibleNodes.length > 0} onChange={toggleSelectAll} />
                </th>
                <th style={{ ...layout.th, width: 120 }}>能力</th>
                <th style={layout.th}>说明</th>
                <th style={{ ...layout.th, width: 120 }}>接口标识 (Slug)</th>
                <th style={{ ...layout.th, width: 80 }}>MCP Tool</th>
                <th style={{ ...layout.th, width: 70 }}>来源</th>
                <th style={{ ...layout.th, textAlign: 'right', width: 180 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleNodes.map((n) => (
                <tr key={n.id} style={n.hidden ? layout.hiddenRow : undefined}>
                  <td style={layout.td}>
                    <input type="checkbox" checked={selectedIds.has(n.id)} onChange={() => toggleSelect(n.id)} />
                  </td>
                  <td style={layout.td}>
                    <div style={{ ...layout.flexRow }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: n.slug && FILE_SYSTEM_CAPABILITIES.find((c) => c.id === n.slug)?.danger
                          ? 'var(--danger)' : 'var(--accent)',
                        display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{n.name}</span>
                    </div>
                  </td>
                  <td style={{ ...layout.td, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {n.description || '—'}
                  </td>
                  <td style={layout.td}>
                    {n.slug ? (
                      <code style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>
                        {n.slug}
                      </code>
                    ) : (
                      <span style={{ ...layout.textMuted, fontSize: 11 }}>未配置</span>
                    )}
                  </td>
                  <td style={layout.td}>
                    {n.slug ? (
                      n.mcpToolEnabled ? (
                        <span style={{ color: 'var(--success)', fontSize: 12 }}>● 已注册</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>○ 未启用</span>
                      )
                    ) : (
                      <span style={{ ...layout.textMuted, fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={layout.td}><span style={sourceBadge(n.source)} /></td>
                  <td style={{ ...layout.td, textAlign: 'right' }}>
                    <div style={{ ...layout.flexRow, justifyContent: 'flex-end' }}>
                      <button
                        style={{ ...layout.btn, ...layout.btnSmall, color: 'var(--accent)', borderColor: 'var(--accent)' }}
                        onClick={() => setDebuggingNodeId(debuggingNodeId === n.id ? null : n.id)}
                      >
                        {debuggingNodeId === n.id ? '关闭调试' : '调试'}
                      </button>
                      {n.hidden ? (
                        <button style={{ ...layout.btn, ...layout.btnSmall }} onClick={() => handleUnarchive(n.id)}>
                          取消归档
                        </button>
                      ) : (
                        <button style={{ ...layout.btn, ...layout.btnSmall }} onClick={() => handleArchive(n.id)}>
                          归档
                        </button>
                      )}
                      <button style={{ ...layout.btn, ...layout.btnSmall, ...layout.btnDanger }} onClick={() => setDeletingId(n.id)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 调试面板 */}
      {debuggingNodeId && (() => {
        const debugNode = nodes.find((n) => n.id === debuggingNodeId);
        if (!debugNode) return null;
        return <SandboxPanel node={debugNode} onClose={() => setDebuggingNodeId(null)} />;
      })()}

      {/* 删除确认 */}
      {deletingId && (
        <ConfirmDialog
          title="删除能力节点"
          message="删除后该能力将不再可用，如需继续使用需重新添加。确定要删除吗？"
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
};
