// ============================================================
// API 节点管理页面 · 列表 + CRUD + 归档/反归档
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { styles, methodStyle } from '../styles.js';
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
      ? { ...styles.badge, ...styles.badgeBlue, children: 'OpenAPI' }
      : { ...styles.badge, ...styles.badgeGreen, children: '自定义' };

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.flexRow}>
          <button style={styles.btn} onClick={onBack}>← 返回项目列表</button>
          <h1 style={styles.title}>{project.name} · API 节点</h1>
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            ({visibleNodes.length} 个活跃{hiddenCount > 0 ? `，${hiddenCount} 个已归档` : ''})
          </span>
        </div>
        <div style={styles.flexRow}>
          <label style={{ ...styles.flexRow, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            显示已归档
          </label>
          {project.type === 'openapi' && (
            <button style={styles.btn} onClick={() => setShowImport(true)}>
              导入 OpenAPI
            </button>
          )}
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => setShowForm(true)}>
            + 新建节点
          </button>
        </div>
      </div>

      {project.description && (
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>{project.description}</p>
      )}

      {loading ? (
        <p style={{ color: '#9ca3af' }}>加载中…</p>
      ) : visibleNodes.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#9ca3af', marginBottom: 16 }}>
            {showHidden ? '暂无节点' : '暂无活跃节点，点击上方按钮创建或导入'}
          </p>
        </div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 60 }}>方法</th>
                <th style={styles.th}>名称</th>
                <th style={styles.th}>接口地址</th>
                <th style={styles.th}>来源</th>
                <th style={styles.th}>分组</th>
                <th style={styles.th}>备注</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleNodes.map((n) => (
                <tr key={n.id} style={n.hidden ? styles.hiddenRow : undefined}>
                  <td style={styles.td}>
                    <span style={{ ...methodStyle(n.method), fontSize: 13 }}>{n.method}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 500 }}>{n.name}</span>
                    {n.description && (
                      <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>{n.description}</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'middle' }}>{n.path}</code>
                  </td>
                  <td style={styles.td}><span style={sourceBadge(n.source)} /></td>
                  <td style={styles.td}><span style={{ fontSize: 13, color: '#6b7280' }}>{n.group || '-'}</span></td>
                  <td style={styles.td}><span style={{ fontSize: 13, color: '#6b7280' }}>{n.remark || '-'}</span></td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={{ ...styles.flexRow, justifyContent: 'flex-end' }}>
                      <button
                        style={{ ...styles.btn, ...styles.btnSmall }}
                        onClick={() => setEditingNode(n)}
                      >
                        编辑
                      </button>
                      {n.hidden ? (
                        <button
                          style={{ ...styles.btn, ...styles.btnSmall }}
                          onClick={() => handleUnarchive(n.id)}
                        >
                          取消归档
                        </button>
                      ) : (
                        <button
                          style={{ ...styles.btn, ...styles.btnSmall }}
                          onClick={() => handleArchive(n.id)}
                        >
                          归档
                        </button>
                      )}
                      <button
                        style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnDanger }}
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
        <NodeForm
          projectId={project.id}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingNode && (
        <NodeForm
          projectId={project.id}
          node={editingNode}
          onSubmit={handleUpdate}
          onCancel={() => setEditingNode(null)}
        />
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
          onDone={() => {
            setShowImport(false);
            fetchNodes();
          }}
          onCancel={() => setShowImport(false)}
        />
      )}
    </div>
  );
};
