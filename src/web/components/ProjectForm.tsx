// ============================================================
// 项目表单 · 创建/编辑
// ============================================================
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { layout } from '../styles.js';
import { FieldHint } from './FieldHint.js';
import type { ApiProject, ProjectType } from '@shared/types.js';

interface ProjectFormProps {
  project?: ApiProject | null;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSubmit, onCancel }) => {
  const isEdit = !!project;
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [type, setType] = useState<ProjectType>(project?.type ?? 'custom');
  const [sourceUrl, setSourceUrl] = useState(project?.sourceUrl ?? '');
  const [workspaceRoot, setWorkspaceRoot] = useState(project?.workspaceRoot ?? '');
  const [slug, setSlug] = useState(project?.slug ?? '');
  const [mcpEnabled, setMcpEnabled] = useState(project?.mcpEnabled ?? false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = '项目名称不能为空';
    if (!isEdit && type === 'filesystem' && !workspaceRoot.trim()) {
      errors.workspaceRoot = '文件系统项目必须配置工作区根目录';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const data: Record<string, unknown> = { name: name.trim(), description: description.trim() };
    if (!isEdit) data.type = type;
    if ((type === 'openapi' || (isEdit && project?.type === 'openapi'))) {
      data.sourceUrl = sourceUrl.trim() || undefined;
    }
    if ((type === 'filesystem' || (isEdit && project?.type === 'filesystem'))) {
      data.workspaceRoot = workspaceRoot.trim() || undefined;
    }
    data.slug = slug.trim() || undefined;
    data.mcpEnabled = mcpEnabled;
    onSubmit(data);
  };

  return createPortal(
    <div style={layout.modalOverlay} onClick={onCancel}>
      <div style={layout.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 700 }}>
          {isEdit ? '编辑项目' : '新建项目'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={layout.formGroup}>
            <label style={layout.label}>
              项目名称 <span style={{ color: 'var(--danger)' }}>*</span>
              <FieldHint text="给 API 项目集起一个名称，例如「电商平台」「内部工具」" />
            </label>
            <input
              style={{
                ...layout.input,
                ...(formErrors.name ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-soft)' } : {}),
              }}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formErrors.name) setFormErrors((prev) => { const { name: _, ...rest } = prev; return rest; });
              }}
              placeholder="输入项目名称"
              autoFocus
            />
            {formErrors.name && (
              <span style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                {formErrors.name}
              </span>
            )}
          </div>
          <div style={layout.formGroup}>
            <label style={layout.label}>
              描述
              <FieldHint text="简要描述这个项目集的用途和包含的接口范围" />
            </label>
            <textarea
              style={layout.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述项目内容"
            />
          </div>
          {!isEdit && (
            <div style={layout.formGroup}>
              <label style={layout.label}>
                项目类型
                <FieldHint text="自定义接口：手动逐个添加 API 节点。OpenAPI 托管：通过 URL 或 JSON 导入规范文档自动生成节点。文件系统：将文件系统操作暴露为 MCP 工具" />
              </label>
              <select style={layout.select} value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
                <option value="custom">自定义接口</option>
                <option value="openapi">OpenAPI 托管</option>
                <option value="filesystem">文件系统 (File System)</option>
              </select>
            </div>
          )}
          {(type === 'openapi' || (isEdit && project?.type === 'openapi')) && (
            <div style={layout.formGroup}>
              <label style={layout.label}>
                OpenAPI 远程 URL
                <FieldHint text="OpenAPI 规范文档的远程地址。留空则通过节点管理页手动导入" />
              </label>
              <input
                style={layout.input}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
              />
            </div>
          )}

          {(type === 'filesystem' || (isEdit && project?.type === 'filesystem')) && (
            <div style={layout.formGroup}>
              <label style={layout.label}>
                工作区根目录 (Workspace Root)
                <FieldHint text="文件系统操作的作用域根路径。所有文件读写操作将被限制在此目录范围内。Docker 部署时填入容器内挂载路径，如 /data" />
              </label>
              <input
                style={{
                  ...layout.input,
                  ...(formErrors.workspaceRoot ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px var(--danger-soft)' } : {}),
                }}
                value={workspaceRoot}
                onChange={(e) => {
                  setWorkspaceRoot(e.target.value);
                  if (formErrors.workspaceRoot) {
                    setFormErrors((prev) => { const { workspaceRoot: _, ...rest } = prev; return rest; });
                  }
                }}
                placeholder="/app/data（Docker 挂载路径）或 C:\Projects\my-app（本地路径）"
              />
              {formErrors.workspaceRoot && (
                <span style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'block' }}>
                  {formErrors.workspaceRoot}
                </span>
              )}
            </div>
          )}
          <div style={layout.formGroup}>
            <label style={layout.label}>
              项目标识 (Slug)
              <FieldHint text="英文字母、数字、短横线及下划线。作为 MCP 端点路径的一部分。留空则自动从名称生成" />
            </label>
            <input
              style={layout.input}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如 my-project 或 user-service（留空自动生成）"
            />
          </div>
          {isEdit && (
            <div style={{ ...layout.formGroup, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ ...layout.label, marginBottom: 0 }}>MCP 服务</label>
              <button
                type="button"
                onClick={() => setMcpEnabled(!mcpEnabled)}
                disabled={!slug.trim()}
                title={!slug.trim() ? '请先配置项目标识' : mcpEnabled ? '点击禁用 MCP 服务' : '点击启用 MCP 服务'}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: slug.trim() ? 'pointer' : 'not-allowed',
                  background: mcpEnabled ? 'var(--success)' : 'var(--border)',
                  position: 'relative', transition: 'background 0.2s', opacity: slug.trim() ? 1 : 0.5,
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: mcpEnabled ? 22 : 2,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 12, color: mcpEnabled ? 'var(--success)' : 'var(--text-secondary)' }}>
                {mcpEnabled ? `已启用 — /api/${slug || '?'}/mcp` : '未启用'}
              </span>
            </div>
          )}
          <div style={{ ...layout.flexRow, justifyContent: 'flex-end', marginTop: 24, gap: 12 }}>
            <button type="button" style={layout.btn} onClick={onCancel}>取消</button>
            <button type="submit" style={{ ...layout.btn, ...layout.btnPrimary }} disabled={!name.trim()}>
              {isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
