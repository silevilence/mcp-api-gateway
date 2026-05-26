// ============================================================
// OpenAPI 导入组件
// ============================================================
import React, { useState } from 'react';
import { styles } from '../styles.js';
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
        if (!url.trim()) {
          setError('请输入 OpenAPI 文档 URL');
          setLoading(false);
          return;
        }
        const res = await openapiApi.parseUrl(url.trim());
        if (res.code === 0) {
          setResult(res.data);
        } else {
          setError(res.message);
        }
      } else {
        if (!jsonText.trim()) {
          setError('请输入 OpenAPI JSON 文档内容');
          setLoading(false);
          return;
        }
        const res = await openapiApi.parseJson(jsonText.trim(), projectId);
        if (res.code === 0) {
          setResult(res.data);
        } else {
          setError(res.message);
        }
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
        projectId,
        url: mode === 'url' ? url.trim() : undefined,
        jsonText: mode === 'json' ? jsonText.trim() : undefined,
      });
      if (res.code === 0) {
        const diff = res.data;
        const parts: string[] = [];
        if (diff.added.length) parts.push(`新增 ${diff.added.length} 个`);
        if (diff.removed.length) parts.push(`移除 ${diff.removed.length} 个`);
        if (diff.modified.length) parts.push(`更新 ${diff.modified.length} 个`);
        setResult({ endpointCount: diff.added.length + diff.modified.length });
        setError(null);
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

  return (
    <div style={styles.modal} onClick={onCancel}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 18 }}>导入 OpenAPI 文档</h3>

        <div style={{ ...styles.flexRow, marginBottom: 16 }}>
          <button
            style={{ ...styles.btn, ...(mode === 'url' ? styles.btnPrimary : {}) }}
            onClick={() => setMode('url')}
          >
            远程 URL
          </button>
          <button
            style={{ ...styles.btn, ...(mode === 'json' ? styles.btnPrimary : {}) }}
            onClick={() => setMode('json')}
          >
            本地 JSON
          </button>
        </div>

        {mode === 'url' ? (
          <div style={styles.formGroup}>
            <label style={styles.label}>文档 URL</label>
            <input
              style={styles.input}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/openapi.json"
            />
          </div>
        ) : (
          <div style={styles.formGroup}>
            <label style={styles.label}>OpenAPI JSON 内容</label>
            <textarea
              style={{ ...styles.textarea, minHeight: 200 }}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="粘贴完整的 OpenAPI / Swagger JSON..."
            />
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 6, marginBottom: 12, fontSize: 13, color: '#991b1b' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ padding: '8px 12px', background: '#d1fae5', borderRadius: 6, marginBottom: 12, fontSize: 13, color: '#065f46' }}>
            解析成功，共 {result.endpointCount} 个端点
          </div>
        )}

        <div style={{ ...styles.flexRow, justifyContent: 'flex-end', marginTop: 16 }}>
          <button style={styles.btn} onClick={onCancel}>关闭</button>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={handleImport}
            disabled={loading}
          >
            {loading ? '解析中…' : '解析'}
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={handleSyncDiff}
            disabled={loading}
          >
            {loading ? '比对中…' : '智能 Diff 同步'}
          </button>
        </div>
      </div>
    </div>
  );
};
