// ============================================================
// 项目表单 · 创建/编辑
// ============================================================
import React, { useState } from 'react';
import { styles } from '../styles.js';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEdit) {
      const data: Record<string, unknown> = { name: name.trim(), description: description.trim() };
      if (type === 'openapi') {
        data.sourceUrl = sourceUrl.trim() || undefined;
      }
      onSubmit(data);
    } else {
      const data: Record<string, unknown> = { name: name.trim(), description: description.trim(), type };
      if (type === 'openapi') {
        data.sourceUrl = sourceUrl.trim() || undefined;
      }
      onSubmit(data);
    }
  };

  return (
    <div style={styles.modal} onClick={onCancel}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 18 }}>
          {isEdit ? '编辑项目' : '新建项目'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              项目名称 <span style={{ color: '#dc2626' }}>*</span>
              <FieldHint text="给 API 项目集起一个名称，例如「电商平台」「内部工具」" />
            </label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称"
              autoFocus
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              描述
              <FieldHint text="简要描述这个项目集的用途和包含的接口范围" />
            </label>
            <textarea
              style={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述项目内容"
            />
          </div>
          {!isEdit && (
            <div style={styles.formGroup}>
              <label style={styles.label}>
                项目类型
                <FieldHint text="自定义接口：手动逐个添加 API 节点。OpenAPI 托管：通过 URL 或 JSON 导入 OpenAPI 规范文档自动生成节点" />
              </label>
              <select style={styles.select} value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
                <option value="custom">自定义接口</option>
                <option value="openapi">OpenAPI 托管</option>
              </select>
            </div>
          )}
          {(type === 'openapi' || (isEdit && project?.type === 'openapi')) && (
            <div style={styles.formGroup}>
              <label style={styles.label}>
                OpenAPI 远程 URL
                <FieldHint text="OpenAPI 规范文档的远程地址，例如 https://api.example.com/openapi.json。留空则通过节点管理页手动导入" />
              </label>
              <input
                style={styles.input}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
              />
            </div>
          )}
          <div style={{ ...styles.flexRow, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" style={styles.btn} onClick={onCancel}>取消</button>
            <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary }} disabled={!name.trim()}>
              {isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
