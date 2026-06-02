// ============================================================
// API 项目管理页面 · 列表 + CRUD
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { layout } from '../styles.js';
import { projectsApi } from '../apiClient.js';
import { ProjectForm } from '../components/ProjectForm.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { useToast } from '../components/Toast.js';
import type { ApiProject } from '@shared/types.js';

interface ProjectsPageProps {
  onSelectProject: (project: ApiProject) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectsApi.list();
      if (res.code === 0) setProjects(res.data);
    } catch {
      showToast('加载项目列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await projectsApi.create(data as never);
    if (res.code === 0) {
      showToast('项目创建成功', 'success');
      setShowForm(false);
      fetchProjects();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingProject) return;
    const res = await projectsApi.update(editingProject.id, data as never);
    if (res.code === 0) {
      showToast('项目更新成功', 'success');
      setEditingProject(null);
      fetchProjects();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await projectsApi.delete(deletingId);
    if (res.code === 0) {
      showToast('项目已删除', 'success');
      setDeletingId(null);
      fetchProjects();
    } else {
      showToast(res.message, 'error');
    }
  };

  const typeBadge = (type: string) => {
    if (type === 'openapi') return { ...layout.badge, ...layout.badgePurple, children: 'OpenAPI' };
    if (type === 'filesystem') return { ...layout.badge, ...layout.badgeAmber, children: '文件系统' };
    return { ...layout.badge, ...layout.badgeGreen, children: '自定义' };
  };

  return (
    <div>
      <div style={layout.cardHeader}>
        <div>
          <h1 style={layout.pageTitle}>API 项目集</h1>
          <p style={layout.pageSubtitle}>管理所有 API 项目，支持自定义接口与 OpenAPI 托管</p>
        </div>
        <button
          style={{ ...layout.btn, ...layout.btnPrimary }}
          onClick={() => setShowForm(true)}
        >
          + 新建项目
        </button>
      </div>

      {loading ? (
        <div style={layout.emptyState}>
          <div className="skeleton" style={{ width: '60%', height: 20, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: '40%', height: 16, margin: '0 auto' }} />
        </div>
      ) : projects.length === 0 ? (
        <div style={{ ...layout.card, ...layout.emptyState }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⊞</div>
          <p style={{ marginBottom: 8 }}>暂无项目</p>
          <p style={layout.textMuted}>点击上方按钮创建第一个 API 项目</p>
        </div>
      ) : (
        <div style={layout.card}>
          <table style={layout.table}>
            <thead>
              <tr>
                <th style={layout.th}>名称</th>
                <th style={layout.th}>类型</th>
                <th style={{ ...layout.th, width: 60 }}>MCP</th>
                <th style={layout.th}>描述</th>
                <th style={layout.th}>更新时间</th>
                <th style={{ ...layout.th, textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td style={layout.td}>
                    <button
                      style={layout.link}
                      onClick={() => onSelectProject(p)}
                    >
                      {p.name}
                    </button>
                  </td>
                  <td style={layout.td}><span style={typeBadge(p.type)} /></td>
                  <td style={{ ...layout.td, textAlign: 'center' }}>
                    {p.slug ? (
                      <span title={p.mcpEnabled ? `MCP 已启用 — /api/${p.slug}/mcp` : 'MCP 未启用'} style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: p.mcpEnabled ? 'var(--success)' : 'var(--border)',
                      }} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={layout.td}>
                    <span style={layout.textSecondary}>{p.description || '—'}</span>
                  </td>
                  <td style={{ ...layout.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(p.updatedAt).toLocaleString('zh-CN')}
                  </td>
                  <td style={{ ...layout.td, textAlign: 'right' }}>
                    <div style={{ ...layout.flexRow, justifyContent: 'flex-end' }}>
                      <button
                        style={{ ...layout.btn, ...layout.btnSmall }}
                        onClick={() => onSelectProject(p)}
                      >
                        节点
                      </button>
                      <button
                        style={{ ...layout.btn, ...layout.btnSmall }}
                        onClick={() => setEditingProject(p)}
                      >
                        编辑
                      </button>
                      <button
                        style={{ ...layout.btn, ...layout.btnSmall, ...layout.btnDanger }}
                        onClick={() => setDeletingId(p.id)}
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
        <ProjectForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editingProject && (
        <ProjectForm
          project={editingProject}
          onSubmit={handleUpdate}
          onCancel={() => setEditingProject(null)}
        />
      )}

      {deletingId && (
        <ConfirmDialog
          title="删除项目"
          message="删除项目将同时删除其下所有 API 节点，此操作不可撤消。确定要继续吗？"
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
};
