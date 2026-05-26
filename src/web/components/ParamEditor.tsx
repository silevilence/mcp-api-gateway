// ============================================================
// 参数可视化编辑器 · 动态增删行
// ============================================================
import React from 'react';
import { FieldHint } from './FieldHint.js';
import type { ApiParam, ParamType, ParamLocation } from '@shared/types.js';

interface ParamEditorProps {
  params: ApiParam[];
  onChange: (params: ApiParam[]) => void;
  disabled?: boolean;
}

const PARAM_TYPES: ParamType[] = ['string', 'number', 'integer', 'boolean', 'date', 'object', 'array'];
const PARAM_LOCATIONS: ParamLocation[] = ['query', 'path', 'body', 'formData'];

const cell: React.CSSProperties = { padding: '0 4px 0 0' };
const miniInput: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  borderRadius: 4,
  border: '1px solid #d1d5db',
  fontSize: 12,
  boxSizing: 'border-box',
};
const miniSelect: React.CSSProperties = {
  ...miniInput,
  background: '#fff',
};
const addBtn: React.CSSProperties = {
  padding: '5px 14px',
  borderRadius: 4,
  border: '1px dashed #9ca3af',
  background: 'none',
  cursor: 'pointer',
  fontSize: 12,
  color: '#6b7280',
  marginTop: 8,
};
const delBtn: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: 'none',
  background: '#fee2e2',
  color: '#dc2626',
  cursor: 'pointer',
  fontSize: 12,
};

function blankParam(): ApiParam {
  return { key: '', type: 'string', required: false, location: 'query' };
}

export const ParamEditor: React.FC<ParamEditorProps> = ({ params, onChange, disabled }) => {
  const rows = params.length === 0 ? [blankParam()] : params;

  const update = (index: number, patch: Partial<ApiParam>) => {
    const next = rows.map((p, i) => (i === index ? { ...p, ...patch } : p));
    const cleaned = next.filter((p) => p.key.trim() !== '');
    onChange(cleaned);
  };

  const remove = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next);
  };

  const add = () => {
    onChange([...rows, blankParam()]);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>参数定义</span>
        <FieldHint text="定义接口的请求参数：参数名、数据类型、传递位置（query/path/body/formData）、是否必填" />
      </div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', background: '#fafafa' }}>
        {/* 表头 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
          <span style={{ flex: 3, padding: '0 4px' }}>参数名</span>
          <span style={{ flex: 2, padding: '0 4px' }}>类型</span>
          <span style={{ flex: 2, padding: '0 4px' }}>位置</span>
          <span style={{ width: 48, textAlign: 'center' }}>必填</span>
          <span style={{ width: 44 }} />
        </div>
        {/* 数据行 */}
        {rows.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ ...cell, flex: 3 }}>
              <input
                style={miniInput}
                placeholder="参数名"
                value={p.key}
                onChange={(e) => update(i, { key: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div style={{ ...cell, flex: 2 }}>
              <select
                style={miniSelect}
                value={p.type}
                onChange={(e) => update(i, { type: e.target.value as ParamType })}
                disabled={disabled}
              >
                {PARAM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{ ...cell, flex: 2 }}>
              <select
                style={miniSelect}
                value={p.location}
                onChange={(e) => update(i, { location: e.target.value as ParamLocation })}
                disabled={disabled}
              >
                {PARAM_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 48, textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={p.required}
                onChange={(e) => update(i, { required: e.target.checked })}
                disabled={disabled}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
            </div>
            <div style={{ width: 44, textAlign: 'center' }}>
              {!disabled && rows.length > 1 && (
                <button type="button" style={delBtn} onClick={() => remove(i)} title="删除此行">
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
        {!disabled && (
          <button type="button" style={addBtn} onClick={add}>
            + 添加参数
          </button>
        )}
        {disabled && rows.length === 0 && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>无参数</span>
        )}
      </div>
    </div>
  );
};
