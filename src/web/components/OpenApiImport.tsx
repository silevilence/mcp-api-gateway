// ============================================================
// OpenAPI 导入组件
// ============================================================
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { layout } from '../styles.js';
import { openapiApi } from '../apiClient.js';

interface OpenApiImportProps {
  projectId: string;
  onDone: () => void;
  onCancel: () => void;
}

export const OpenApiImport: React.FC<OpenApiImportProps> = ({ projectId, onDone, onCancel }) => {
  const [mode, setMode] = useState<'url' | 'json'>('url');
  const [url, setUrl] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ endpointCount: number } | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'url') {
        if (!url.trim()) { setError('请输入 OpenAPI 文档 URL'); setLoading(false); return; }
        const res = await openapiApi.parseUrl(url.trim());
        if (res.code === 0) setResult(res.data);
        else setError(res.message);
      } else {
        if (!jsonText.trim()) { setError('请输入 OpenAPI JSON 文档内容'); setLoading(false); return; }
        const res = await openapiApi.parseJson(jsonText.trim(), projectId);
        if (res.code === 0) setResult(res.data);
        else setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDiff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await openapiApi.syncDiff({
        projectId, url: mode === 'url' ? url.trim() : undefined,
        jsonText: mode === 'json' ? jsonText.trim() : undefined,
      });
      if (res.code === 0) {
        const diff = res.data;
        const parts: string[] = [];
        if (diff.added.length) parts.push(`新增 ${diff.added.length} 个`);
        if (diff.removed.length) parts.push(`移除 ${diff.removed.length} 个`);
        if (diff.modified.length) parts.push(`更新 ${diff.modified.length} 个`);
        if (parts.length > 0) {
          alert(`Diff 同步完成：${parts.join('，')}`);
        } else {
          alert('没有检测到变更');
        }
        onDone();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步失败');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={layout.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={layout.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 700 }}>导入 OpenAPI 文档</h3>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            style={{ ...layout.btn, ...(mode === 'url' ? layout.btnPrimary : {}) }}
            onClick={() => setMode('url')}
          >
            远程 URL
          </button>
          <button
            style={{ ...layout.btn, ...(mode === 'json' ? layout.btnPrimary : {}) }}
            onClick={() => setMode('json')}
          >
            本地 JSON
          </button>
        </div>

        {mode === 'url' ? (
          <div style={layout.formGroup}>
            <label style={layout.label}>文档 URL</label>
            <input
              style={layout.input}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/openapi.json"
            />
          </div>
        ) : (
          <div style={layout.formGroup}>
            <label style={layout.label}>OpenAPI JSON 内容</label>
            <textarea
              style={{ ...layout.textarea, minHeight: 200 }}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="粘贴完整的 OpenAPI / Swagger JSON..."
            />
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px', background: 'var(--danger-soft)',
            borderRadius: 'var(--radius-md)', marginBottom: 12,
            fontSize: 13, color: 'var(--danger)', border: '1px solid var(--danger)',
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{
            padding: '10px 14px', background: 'var(--success-soft)',
            borderRadius: 'var(--radius-md)', marginBottom: 12,
            fontSize: 13, color: 'var(--success)', border: '1px solid var(--success)',
          }}>
            解析成功，共 {result.endpointCount} 个端点
          </div>
        )}

        <div style={{ ...layout.flexRow, justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
          <button style={layout.btn} onClick={onCancel}>关闭</button>
          <button
            style={{ ...layout.btn, ...layout.btnPrimary }}
            onClick={handleImport}
            disabled={loading}
          >
            {loading ? '解析中…' : '解析'}
          </button>
          <button
            style={{ ...layout.btn, ...layout.btnPrimary }}
            onClick={handleSyncDiff}
            disabled={loading}
          >
            {loading ? '比对中…' : '智能 Diff 同步'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
