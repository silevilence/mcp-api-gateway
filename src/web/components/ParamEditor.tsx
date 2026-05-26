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

const cellCss: React.CSSProperties = { padding: '0 4px 0 0' };
const miniInput: React.CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: 4,
  border: '1px solid var(--border-default)', fontSize: 12,
  background: 'var(--bg-input)', color: 'var(--text-primary)',
};
const miniSelect: React.CSSProperties = {
  ...miniInput, cursor: 'pointer',
};
const addBtn: React.CSSProperties = {
  padding: '5px 14px', borderRadius: 4,
  border: '1px dashed var(--border-default)',
  background: 'transparent', cursor: 'pointer',
  fontSize: 12, color: 'var(--text-muted)', marginTop: 8,
};
const delBtn: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 4, border: 'none',
  background: 'var(--danger-soft)', color: 'var(--danger)',
  cursor: 'pointer', fontSize: 12,
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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>参数定义</span>
        <FieldHint text="定义接口的请求参数：参数名、数据类型、传递位置、是否必填" />
      </div>
      <div style={{
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
        padding: '10px 12px', background: 'var(--bg-input)',
      }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
          <span style={{ flex: 3, padding: '0 4px', display: 'flex', alignItems: 'center' }}>
            参数名<FieldHint text="接口文档中的参数键名，例如 userId、pageSize" />
          </span>
          <span style={{ flex: 2, padding: '0 4px', display: 'flex', alignItems: 'center' }}>
            类型<FieldHint text="参数的数据类型约束：string（字符串）、number（数字）、integer（整数）、boolean（布尔）、date（日期）、object（对象）、array（数组）" />
          </span>
          <span style={{ flex: 2, padding: '0 4px', display: 'flex', alignItems: 'center' }}>
            位置<FieldHint text="参数在 HTTP 请求中的传递方式：query（URL 查询参数）、path（路径变量）、body（请求体 JSON）、formData（表单数据）" />
          </span>
          <span style={{ width: 48, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            必填<FieldHint text="勾选后此参数为必传项，调用时不可省略" />
          </span>
          <span style={{ width: 44 }} />
        </div>
        {rows.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ ...cellCss, flex: 3 }}>
              <input
                style={miniInput}
                placeholder="参数名"
                value={p.key}
                onChange={(e) => update(i, { key: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div style={{ ...cellCss, flex: 2 }}>
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
            <div style={{ ...cellCss, flex: 2 }}>
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
                style={{ cursor: disabled ? 'not-allowed' : 'pointer', accentColor: 'var(--accent)' }}
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
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>无参数</span>
        )}
      </div>
    </div>
  );
};
