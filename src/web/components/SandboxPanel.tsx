// ============================================================
// 在线调试沙箱浮窗 · 参数表单 + 请求预览 + 响应渲染
// ============================================================
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { layout } from '../styles.js';
import { sandboxApi } from '../apiClient.js';
import { JsonViewer } from './JsonViewer.js';
import type { ApiNode, SandboxResponse } from '@shared/types.js';

interface SandboxPanelProps {
  node: ApiNode;
  onClose: () => void;
}

export const SandboxPanel: React.FC<SandboxPanelProps> = ({ node, onClose }) => {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState(() => {
    try {
      return localStorage.getItem(`sandbox-baseurl-${node.projectId}`) ?? '';
    } catch { return ''; }
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SandboxResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsBaseUrl = useMemo(() => !/^https?:\/\//i.test(node.path), [node.path]);

  const handleParamChange = (key: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value);
    try { localStorage.setItem(`sandbox-baseurl-${node.projectId}`, value); } catch { /* ignore */ }
  };

  const buildRequestPreview = () => {
    const base = baseUrl.replace(/\/+$/, '') || 'http://localhost';
    let url = node.path;
    if (!/^https?:\/\//i.test(url)) {
      url = base + (url.startsWith('/') ? url : '/' + url);
    }
    const queryParams = node.params
      .filter((p) => p.location === 'query' && paramValues[p.key])
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(paramValues[p.key])}`)
      .join('&');
    if (queryParams) url += (url.includes('?') ? '&' : '?') + queryParams;
    return url;
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await sandboxApi.execute(
        node.id,
        paramValues,
        needsBaseUrl ? (baseUrl || undefined) : undefined,
      );
      if (res.code === 0) {
        setResponse(res.data as SandboxResponse);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const getResponseDisplay = () => {
    if (!response) return null;
    const ct = response.contentType;
    let displayBody: unknown = response.body;
    if (ct.includes('json')) {
      try { displayBody = JSON.parse(response.body); } catch { /* keep as text */ }
    }
    const statusColor = response.statusCode < 300 ? 'var(--success)'
      : response.statusCode < 400 ? 'var(--warning)'
      : 'var(--danger)';

    return (
      <div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 12, flexWrap: 'wrap' }}>
          <span>状态: <span style={{ color: statusColor, fontWeight: 600 }}>{response.statusCode}</span></span>
          <span>耗时: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{response.responseTimeMs}ms</span></span>
          <span style={{ color: 'var(--text-secondary)' }}>类型: {ct.split(';')[0]}</span>
        </div>
        {ct.includes('json') && typeof displayBody === 'object' ? (
          <JsonViewer data={displayBody} maxHeight={350} />
        ) : (
          <pre style={{
            background: '#0d1117', borderRadius: 6, padding: 12,
            maxHeight: 350, overflow: 'auto',
            fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: '#c9d1d9', margin: 0,
          }}>
            {response.body}
          </pre>
        )}
      </div>
    );
  };

  return createPortal(
    <div style={layout.modalOverlay}>
      <div style={{ ...layout.modalContent, maxWidth: 900, width: '90vw', maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            🔧 在线调试 — {node.name}
          </h3>
          <button style={{ ...layout.btn, ...layout.btnSmall }} onClick={onClose}>✕ 关闭</button>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* 左栏：参数表单 */}
          <div style={{ flex: '1 1 300px', minWidth: 260 }}>
            {needsBaseUrl && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                  Base URL
                </label>
                <input
                  style={{ ...layout.input, fontSize: 13 }}
                  value={baseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  placeholder="http://localhost:3000"
                />
              </div>
            )}

            <div style={{ marginBottom: 12, fontSize: 13 }}>
              <span style={{ fontWeight: 600, marginRight: 8, color: 'var(--accent)' }}>{node.method}</span>
              <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{node.path}</code>
            </div>

            {node.params.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>此接口无参数定义</p>
            ) : (
              node.params.map((param) => (
                <div key={param.key} style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
                    {param.key}
                    {param.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({param.location}{param.type ? `, ${param.type}` : ''})</span>
                  </label>
                  {param.location === 'body' ? (
                    <textarea
                      style={{ ...layout.textarea, minHeight: 80, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      value={paramValues[param.key] ?? ''}
                      onChange={(e) => handleParamChange(param.key, e.target.value)}
                      placeholder={param.description || `输入 ${param.key}`}
                    />
                  ) : (
                    <input
                      style={{ ...layout.input, fontSize: 13 }}
                      value={paramValues[param.key] ?? ''}
                      onChange={(e) => handleParamChange(param.key, e.target.value)}
                      placeholder={param.description || `输入 ${param.key}`}
                    />
                  )}
                </div>
              ))
            )}

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
              {buildRequestPreview()}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...layout.btn, ...layout.btnPrimary, flex: 1 }}
                onClick={handleSend}
                disabled={loading}
              >
                {loading ? '⏳ 发送中...' : '▶ 发送请求'}
              </button>
              <button
                style={layout.btn}
                onClick={() => { setParamValues({}); setResponse(null); setError(null); }}
              >
                ↻ 重置
              </button>
            </div>
          </div>

          {/* 右栏：响应面板 */}
          <div style={{ flex: '1.5 1 380px', minWidth: 320 }}>
            {error && (
              <div style={{
                padding: '10px 14px', background: 'var(--danger-soft)',
                borderRadius: 'var(--radius-md)', marginBottom: 12,
                color: 'var(--danger)', fontSize: 13, border: '1px solid var(--danger)',
              }}>
                {error}
              </div>
            )}
            {response ? getResponseDisplay() : (
              <div style={{
                background: 'var(--bg-input)', borderRadius: 6, padding: 24,
                textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
                minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                点击「发送请求」查看响应结果
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
