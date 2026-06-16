// ============================================================
// 节点表单 · 创建/编辑
// ============================================================
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { layout } from '../styles.js';
import { FieldHint } from './FieldHint.js';
import { ParamEditor } from './ParamEditor.js';
import type { ApiNode, HttpMethod, ApiParam } from '@shared/types.js';

interface NodeFormProps {
  projectId: string;
  node?: ApiNode | null;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const NodeForm: React.FC<NodeFormProps> = ({ projectId, node, onSubmit, onCancel }) => {
  const isEdit = !!node;
  const isOpenApi = node?.source === 'openapi';

  const [name, setName] = useState(node?.name ?? '');
  const [description, setDescription] = useState(node?.description ?? '');
  const [method, setMethod] = useState<HttpMethod>(node?.method ?? 'GET');
  const [path, setPath] = useState(node?.path ?? '');
  const [group, setGroup] = useState(node?.group ?? '');
  const [remark, setRemark] = useState(node?.remark ?? '');
  const [params, setParams] = useState<ApiParam[]>(node?.params ?? []);
  const [slug, setSlug] = useState(node?.slug ?? '');
  const [mcpToolEnabled, setMcpToolEnabled] = useState(node?.mcpToolEnabled ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;

    const data: Record<string, unknown> = {
      name: name.trim(), description: description.trim(),
      method, path: path.trim(), params,
      group: group.trim() || undefined,
      remark: remark.trim() || undefined,
      slug: slug.trim() || undefined,
      mcpToolEnabled,
    };
    if (!isEdit) data.projectId = projectId;
    onSubmit(data);
  };

  return createPortal(
    <div style={layout.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={layout.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 700 }}>
          {isEdit ? '编辑 API 节点' : '新建 API 节点'}
        </h3>
        {isOpenApi && (
          <div style={{
            padding: '10px 14px', background: 'var(--warning-soft)',
            borderRadius: 'var(--radius-md)', marginBottom: 20,
            fontSize: 13, color: 'var(--warning)', border: '1px solid var(--warning)',
          }}>
            OpenAPI 托管节点：接口地址 / 方法 / 参数不可修改，仅可编辑备注和分组。
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={layout.formGroup}>
            <label style={layout.label}>
              名称 <span style={{ color: 'var(--danger)' }}>*</span>
              <FieldHint text="给这个接口起一个便于识别的名称，例如「获取用户列表」" />
            </label>
            <input style={layout.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：获取用户列表" autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...layout.formGroup, flex: 1 }}>
              <label style={layout.label}>
                方法 <span style={{ color: 'var(--danger)' }}>*</span>
                <FieldHint text="HTTP 请求方法：GET 获取、POST 创建、PUT 更新、DELETE 删除" />
              </label>
              <select
                style={layout.select}
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                disabled={isOpenApi}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div style={{ ...layout.formGroup, flex: 2 }}>
              <label style={layout.label}>
                接口地址 <span style={{ color: 'var(--danger)' }}>*</span>
                <FieldHint text="完整的接口 URL，例如 https://api.example.com/v1/users" />
              </label>
              <input
                style={layout.input}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="https://api.example.com/v1/users"
                disabled={isOpenApi}
              />
            </div>
          </div>
          <div style={layout.formGroup}>
            <label style={layout.label}>
              描述
              <FieldHint text="简要说明这个接口的用途和业务含义" />
            </label>
            <textarea style={layout.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="接口的用途和说明" />
          </div>
          <div style={layout.formGroup}>
            <ParamEditor params={params} onChange={setParams} disabled={isOpenApi} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...layout.formGroup, flex: 1 }}>
              <label style={layout.label}>
                分组
                <FieldHint text="给接口打上分组标签，方便在列表中按组筛选" />
              </label>
              <input style={layout.input} value={group} onChange={(e) => setGroup(e.target.value)} placeholder="例如：用户管理" />
            </div>
            <div style={{ ...layout.formGroup, flex: 1 }}>
              <label style={layout.label}>
                备注
                <FieldHint text="额外的备忘信息，仅自己可见" />
              </label>
              <input style={layout.input} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="附加备注" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...layout.formGroup, flex: 1 }}>
              <label style={layout.label}>
                接口标识 (Slug)
                <FieldHint text="英文字母、数字、短横线及下划线。作为 MCP Tool 名称。留空则自动从名称生成" />
              </label>
              <input style={layout.input} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="例如 get-user-list（留空自动生成）" />
            </div>
            <div style={{ ...layout.formGroup, flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <label style={{ ...layout.label, marginBottom: 4 }}>MCP Tool</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
                  <button
                    type="button"
                    onClick={() => setMcpToolEnabled(!mcpToolEnabled)}
                    disabled={!slug.trim()}
                    title={!slug.trim() ? '请先配置接口标识' : mcpToolEnabled ? '点击取消注册' : '点击注册为 MCP Tool'}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: slug.trim() ? 'pointer' : 'not-allowed',
                      background: mcpToolEnabled ? 'var(--success)' : 'var(--border)',
                      position: 'relative', transition: 'background 0.2s', opacity: slug.trim() ? 1 : 0.5,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: mcpToolEnabled ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                  <span style={{ fontSize: 12, color: mcpToolEnabled ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {mcpToolEnabled ? '已注册' : '未注册'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ ...layout.flexRow, justifyContent: 'flex-end', marginTop: 24, gap: 12 }}>
            <button type="button" style={layout.btn} onClick={onCancel}>取消</button>
            <button type="submit" style={{ ...layout.btn, ...layout.btnPrimary }} disabled={!name.trim() || !path.trim()}>
              {isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
