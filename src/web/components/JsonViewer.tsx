// ============================================================
// JSON 语法高亮查看器 · 支持折叠/展开
// ============================================================
import React, { useState } from 'react';

interface JsonViewerProps {
  data: unknown;
  maxHeight?: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, maxHeight = 400 }) => {
  return (
    <div style={{
      background: '#0d1117', borderRadius: 6, padding: 12,
      maxHeight, overflow: 'auto',
      fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    }}>
      <JsonNode value={data} depth={0} />
    </div>
  );
};

// ---- 递归渲染 ----
const JsonNode: React.FC<{ value: unknown; depth: number; keyName?: string }> = ({ value, depth, keyName }) => {
  const [collapsed, setCollapsed] = useState(false);
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  if (value === null) return <><span style={{ color: '#8b949e' }}>null</span></>;
  if (value === undefined) return <><span style={{ color: '#8b949e' }}>undefined</span></>;

  if (typeof value === 'boolean') {
    return <><span style={{ color: '#79c0ff' }}>{String(value)}</span></>;
  }

  if (typeof value === 'number') {
    return <><span style={{ color: '#a5d6ff' }}>{value}</span></>;
  }

  if (typeof value === 'string') {
    // 尝试解析为 JSON 字符串
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        // 递归渲染
        return <JsonNode value={parsed} depth={depth} keyName={keyName} />;
      }
    } catch { /* not JSON */ }
    return <><span style={{ color: '#7ee787' }}>"{escapeHtml(value)}"</span></>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <><span style={{ color: '#c9d1d9' }}>[]</span></>;

    const toggle = (
      <span onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer', userSelect: 'none', color: '#8b949e' }}>
        {collapsed ? '▶' : '▼'}
      </span>
    );

    if (collapsed) {
      return (
        <div>
          {keyName && <span style={{ color: '#79c0ff' }}>"{keyName}": </span>}
          {toggle} <span style={{ color: '#c9d1d9' }}>Array({value.length})</span>
        </div>
      );
    }

    return (
      <div>
        {keyName && <span style={{ color: '#79c0ff' }}>"{keyName}": </span>}
        {toggle} <span style={{ color: '#c9d1d9' }}>[</span>
        {value.map((item, i) => (
          <div key={i}>
            {'  '.repeat(depth + 1)}
            <JsonNode value={item} depth={depth + 1} />
            {i < value.length - 1 ? <span style={{ color: '#c9d1d9' }}>,</span> : null}
          </div>
        ))}
        <span>{indent}<span style={{ color: '#c9d1d9' }}>]</span></span>
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <><span style={{ color: '#c9d1d9' }}>{'{}'}</span></>;

    const toggle = (
      <span onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer', userSelect: 'none', color: '#8b949e' }}>
        {collapsed ? '▶' : '▼'}
      </span>
    );

    if (collapsed) {
      return (
        <div>
          {keyName && <span style={{ color: '#79c0ff' }}>"{keyName}": </span>}
          {toggle} <span style={{ color: '#c9d1d9' }}>{'{...}'}</span>
        </div>
      );
    }

    return (
      <div>
        {keyName && <span style={{ color: '#79c0ff' }}>"{keyName}": </span>}
        {toggle} <span style={{ color: '#c9d1d9' }}>{'{'}</span>
        {entries.map(([k, v], i) => (
          <div key={k}>
            {childIndent}
            <JsonNode value={v} depth={depth + 1} keyName={k} />
            {i < entries.length - 1 ? <span style={{ color: '#c9d1d9' }}>,</span> : null}
          </div>
        ))}
        <span>{indent}<span style={{ color: '#c9d1d9' }}>{'}'}</span></span>
      </div>
    );
  }

  return <><span style={{ color: '#c9d1d9' }}>{String(value)}</span></>;
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
