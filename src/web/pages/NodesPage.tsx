// ============================================================
// API 节点管理页面 · 列表 + CRUD + 归档/反归档
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { layout, methodStyle } from '../styles.js';
import { nodesApi } from '../apiClient.js';
import { NodeForm } from '../components/NodeForm.js';
import { OpenApiImport } from '../components/OpenApiImport.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { useToast } from '../components/Toast.js';
import type { ApiNode, ApiProject } from '@shared/types.js';

interface NodesPageProps {
  project: ApiProject;
  onBack: () => void;
}

export const NodesPage: React.FC<NodesPageProps> = ({ project, onBack }) => {
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNode, setEditingNode] = useState<ApiNode | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const { showToast } = useToast();

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nodesApi.list(project.id);
      if (res.code === 0) setNodes(res.data);
    } catch {
      showToast('加载节点列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [project.id, showToast]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  const visibleNodes = nodes.filter((n) => showHidden || !n.hidden);
  const hiddenCount = nodes.filter((n) => n.hidden).length;

  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await nodesApi.create(data as never);
    if (res.code === 0) {
      showToast('节点创建成功', 'success');
      setShowForm(false);
      fetchNodes();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingNode) return;
    const res = await nodesApi.update(editingNode.id, data as never);
    if (res.code === 0) {
      showToast('节点更新成功', 'success');
      setEditingNode(null);
      fetchNodes();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await nodesApi.delete(deletingId);
    if (res.code === 0) {
      showToast('节点已删除', 'success');
      setDeletingId(null);
      fetchNodes();
    } else {
      showToast(res.message, 'error');
    }
  };

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

  const sourceBadge = (source: string) =>
    source === 'openapi'
      ? { ...layout.badge, ...layout.badgePurple, children: 'OpenAPI' }
      : { ...layout.badge, ...layout.badgeGreen, children: '自定义' };

  return (
    <div>
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
              {visibleNodes.length} 个活跃{hiddenCount > 0 ? `，${hiddenCount} 个已归档` : ''}
            </span>
          </div>
        </div>
        <div style={layout.flexRow}>
          <label style={{ ...layout.flexRow, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', gap: 6 }}>
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            显示已归档
          </label>
          {project.type === 'openapi' && (
            <button style={layout.btn} onClick={() => setShowImport(true)}>
              导入 OpenAPI
            </button>
          )}
          {project.type === 'custom' && (
            <button style={{ ...layout.btn, ...layout.btnPrimary }} onClick={() => setShowForm(true)}>
              + 新建节点
            </button>
          )}
        </div>
      </div>

      {project.description && (
        <p style={{ ...layout.textSecondary, marginBottom: 16, marginTop: -12 }}>{project.description}</p>
      )}

      {loading ? (
        <div style={layout.emptyState}>
          <div className="skeleton" style={{ width: '60%', height: 20, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: '40%', height: 16, margin: '0 auto' }} />
        </div>
      ) : visibleNodes.length === 0 ? (
        <div style={{ ...layout.card, ...layout.emptyState }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⬡</div>
          <p style={{ marginBottom: 8 }}>
            {showHidden ? '暂无节点' : '暂无活跃节点'}
          </p>
          <p style={layout.textMuted}>
            {project.type === 'openapi' ? '点击上方按钮导入 OpenAPI 文档' : '点击上方按钮创建第一个 API 节点'}
          </p>
        </div>
      ) : (
        <div style={layout.card}>
          <table style={layout.table}>
            <thead>
              <tr>
                <th style={{ ...layout.th, width: 60 }}>方法</th>
                <th style={layout.th}>名称 / 路径</th>
                <th style={layout.th}>来源</th>
                <th style={layout.th}>分组</th>
                <th style={layout.th}>备注</th>
                <th style={{ ...layout.th, textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleNodes.map((n) => (
                <tr key={n.id} style={n.hidden ? layout.hiddenRow : undefined}>
                  <td style={layout.td}>
                    <span style={{ ...methodStyle(n.method), fontSize: 12 }}>{n.method}</span>
                  </td>
                  <td style={layout.td}>
                    <div style={{ fontWeight: 500 }}>{n.name}</div>
                    <code style={{
                      fontSize: 11, background: 'var(--bg-input)', padding: '2px 6px',
                      borderRadius: 4, color: 'var(--text-muted)',
                      maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', display: 'inline-block',
                    }}>
                      {n.path}
                    </code>
                    {n.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {n.description}
                      </div>
                    )}
                  </td>
                  <td style={layout.td}><span style={sourceBadge(n.source)} /></td>
                  <td style={layout.td}>
                    {n.group ? <span style={layout.tag}>{n.group}</span> : <span style={layout.textMuted}>—</span>}
                  </td>
                  <td style={layout.td}>
                    <span style={layout.textSecondary}>{n.remark || '—'}</span>
                  </td>
                  <td style={{ ...layout.td, textAlign: 'right' }}>
                    <div style={{ ...layout.flexRow, justifyContent: 'flex-end' }}>
                      <button
                        style={{ ...layout.btn, ...layout.btnSmall }}
                        onClick={() => setEditingNode(n)}
                      >
                        编辑
                      </button>
                      {n.hidden ? (
                        <button
                          style={{ ...layout.btn, ...layout.btnSmall }}
                          onClick={() => handleUnarchive(n.id)}
                        >
                          取消归档
                        </button>
                      ) : (
                        <button
                          style={{ ...layout.btn, ...layout.btnSmall }}
                          onClick={() => handleArchive(n.id)}
                        >
                          归档
                        </button>
                      )}
                      <button
                        style={{ ...layout.btn, ...layout.btnSmall, ...layout.btnDanger }}
                        onClick={() => setDeletingId(n.id)}
                      >
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

      {showForm && (
        <NodeForm projectId={project.id} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editingNode && (
        <NodeForm projectId={project.id} node={editingNode} onSubmit={handleUpdate} onCancel={() => setEditingNode(null)} />
      )}

      {deletingId && (
        <ConfirmDialog
          title="删除节点"
          message="确定要删除此 API 节点吗？此操作不可撤消。"
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {showImport && (
        <OpenApiImport
          projectId={project.id}
          onDone={() => { setShowImport(false); fetchNodes(); }}
          onCancel={() => setShowImport(false)}
        />
      )}
    </div>
  );
};
