// ============================================================
// API 项目管理页面 · 列表 + CRUD
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { styles } from '../styles.js';
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

  const typeBadge = (type: string) =>
    type === 'openapi'
      ? { ...styles.badge, ...styles.badgeBlue, children: 'OpenAPI' }
      : { ...styles.badge, ...styles.badgeGreen, children: '自定义' };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>API 项目集</h1>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => setShowForm(true)}
        >
          + 新建项目
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>加载中…</p>
      ) : projects.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#9ca3af', marginBottom: 16 }}>暂无项目，点击上方按钮创建第一个项目</p>
        </div>
      ) : (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>名称</th>
                <th style={styles.th}>类型</th>
                <th style={styles.th}>描述</th>
                <th style={styles.th}>更新时间</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td style={styles.td}>
                    <span
                      style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => onSelectProject(p)}
                    >
                      {p.name}
                    </span>
                  </td>
                  <td style={styles.td}><span style={typeBadge(p.type)} /></td>
                  <td style={styles.td}><span style={{ color: '#6b7280', fontSize: 13 }}>{p.description || '-'}</span></td>
                  <td style={styles.td}>{new Date(p.updatedAt).toLocaleString('zh-CN')}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={{ ...styles.flexRow, justifyContent: 'flex-end' }}>
                      <button
                        style={{ ...styles.btn, ...styles.btnSmall }}
                        onClick={() => onSelectProject(p)}
                      >
                        查看节点
                      </button>
                      <button
                        style={{ ...styles.btn, ...styles.btnSmall }}
                        onClick={() => setEditingProject(p)}
                      >
                        编辑
                      </button>
                      <button
                        style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnDanger }}
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
        <ProjectForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
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
