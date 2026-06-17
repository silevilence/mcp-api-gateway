// ============================================================
// 多模态媒体参数输入组件
// URL / 本地文件 / 剪贴板 三种输入模式
// ============================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { layout } from '../styles.js';

/** 支持的 MIME 类型白名单 */
const MIME_WHITELIST: Record<string, string[]> = {
  'image/*': ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  'video/*': ['video/mp4', 'video/quicktime', 'video/x-m4v'],
};

type InputMode = 'url' | 'file' | 'clipboard';

interface MediaInputProps {
  value: string;
  onChange: (value: string) => void;
  accept: 'image/*' | 'video/*';
  maxSizeMB?: number;
  placeholder?: string;
  disabled?: boolean;
}

const modeTabs: { mode: InputMode; icon: string; label: string }[] = [
  { mode: 'url', icon: '🔗', label: 'URL' },
  { mode: 'file', icon: '📁', label: '本地文件' },
  { mode: 'clipboard', icon: '📋', label: '剪贴板' },
];

const isVideo = (accept: string) => accept === 'video/*';

export const MediaInput: React.FC<MediaInputProps> = ({
  value,
  onChange,
  accept,
  maxSizeMB,
  placeholder,
  disabled,
}) => {
  const [mode, setMode] = useState<InputMode>('url');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [encoding, setEncoding] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 同步外部 value 到 URL draft
  useEffect(() => {
    setUrlDraft(value);
  }, [value]);

  const maxBytes = (maxSizeMB ?? (isVideo(accept) ? 8 : 10)) * 1024 * 1024;
  const allowedTypes = MIME_WHITELIST[accept] ?? [];

  // ---- 工具函数 ----
  const setError_ = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  const validateMime = useCallback(
    (file: File): boolean => {
      if (allowedTypes.includes(file.type)) return true;
      const labels = allowedTypes.map((t) => t.split('/')[1]?.toUpperCase()).join(' / ');
      setError_(`不支持的文件类型，请上传 ${labels}`);
      return false;
    },
    [allowedTypes, setError_],
  );

  const validateSize = useCallback(
    (file: File): boolean => {
      if (file.size <= maxBytes) return true;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = (maxBytes / (1024 * 1024)).toFixed(0);
      setError_(`文件过大（${sizeMB} MB），上限为 ${limitMB} MB`);
      return false;
    },
    [maxBytes, setError_],
  );

  const encodeFile = useCallback(
    (file: File) => {
      if (!validateMime(file) || !validateSize(file)) return;
      setEncoding(true);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onChange(result);
        setEncoding(false);
        setError(null);
      };
      reader.onerror = () => {
        setError_('文件读取失败，请重试');
        setEncoding(false);
      };
      // 10s 超时保护
      const timeout = setTimeout(() => {
        setError_('文件处理超时，请尝试更小的文件');
        setEncoding(false);
      }, 10000);
      reader.onloadend = () => clearTimeout(timeout);
      reader.readAsDataURL(file);
    },
    [onChange, validateMime, validateSize, setError_],
  );

  // ---- URL 模式 ----
  const isValidUrl = (v: string): boolean =>
    /^(https?:\/\/|data:)/i.test(v.trim());

  const handleUrlBlur = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) {
      setError(null);
      return;
    }
    if (isValidUrl(trimmed)) {
      setError(null);
      onChange(trimmed);
    } else {
      setError_('请输入有效的 HTTP URL 或以 data: 开头的 Base64 编码');
    }
  };

  // ---- 文件模式 ----
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) encodeFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) encodeFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  // ---- 剪贴板模式 ----
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) encodeFile(file);
        return;
      }
    }
  };

  // ---- 预览 ----
  const showPreview = value && value.startsWith('data:');
  const previewUrl = showPreview ? value : undefined;
  const isVideoPreview = showPreview && value.startsWith('data:video');

  // ---- 样式 ----
  const tabBarCss: React.CSSProperties = {
    display: 'flex', gap: 4, marginBottom: 12,
  };
  const tabCss = (active: boolean): React.CSSProperties => ({
    ...layout.btn,
    ...layout.btnSmall,
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    borderColor: active ? 'var(--accent)' : 'var(--border-default)',
    fontWeight: active ? 600 : 400,
  });
  const dropZoneCss: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '28px 20px', borderRadius: 'var(--radius-md)',
    border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-default)'}`,
    background: dragging ? 'var(--accent-soft)' : 'var(--bg-input)',
    transition: 'all var(--transition-fast)', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
  const pasteZoneCss: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '28px 20px', borderRadius: 'var(--radius-md)',
    border: '2px dashed var(--border-default)',
    background: 'var(--bg-input)', minHeight: 80,
    fontSize: 13, color: 'var(--text-muted)',
  };
  const errorCss: React.CSSProperties = {
    marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12,
    border: '1px solid var(--danger)',
  };
  const previewWrapperCss: React.CSSProperties = {
    marginTop: 10, padding: 8, borderRadius: 'var(--radius-md)',
    background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
    display: 'flex', alignItems: 'center', gap: 10,
  };
  const previewImgCss: React.CSSProperties = {
    maxHeight: 120, maxWidth: '100%', borderRadius: 'var(--radius-sm)',
    objectFit: 'contain',
  };
  const fileInfoCss: React.CSSProperties = {
    fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
  };

  return (
    <div>
      {/* 模式切换 Tab */}
      <div style={tabBarCss}>
        {modeTabs.map((t) => (
          <button
            key={t.mode}
            type="button"
            style={tabCss(mode === t.mode)}
            onClick={() => { setMode(t.mode); setError(null); }}
            disabled={disabled}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* URL 模式 */}
      {mode === 'url' && (
        <input
          style={{ ...layout.input, fontSize: 13 }}
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={(e) => handleUrlBlur(e.target.value)}
          placeholder={placeholder ?? `输入 ${isVideo(accept) ? '视频' : '图像'} URL 或 Base64 data URL`}
          disabled={disabled}
        />
      )}

      {/* 文件模式 */}
      {mode === 'file' && (
        <>
          <div
            data-testid="media-drop-zone"
            style={dropZoneCss}
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <span style={{ fontSize: 28, opacity: dragging ? 1 : 0.5 }}>
              {dragging ? '📥' : '📁'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {dragging ? '释放文件以上传' : '拖拽文件到此处'}
            </span>
            <button
              type="button"
              style={{ ...layout.btn, ...layout.btnSmall, pointerEvents: 'none' }}
            >
              选择文件
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              支持 {allowedTypes.map((t) => t.split('/')[1]?.toUpperCase()).join('、')}
              {' · '} 上限 {(maxBytes / (1024 * 1024)).toFixed(0)} MB
            </span>
          </div>
          <input
            ref={fileInputRef}
            data-testid="media-file-input"
            type="file"
            accept={allowedTypes.join(',')}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={disabled}
          />
          {encoding && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              ⏳ 编码中…
            </div>
          )}
        </>
      )}

      {/* 剪贴板模式 */}
      {mode === 'clipboard' && (
        <div
          data-testid="media-clipboard-zone"
          style={pasteZoneCss}
          onPaste={handlePaste}
          tabIndex={0}
        >
          <span>
            在此区域按 <kbd style={{
              padding: '1px 6px', borderRadius: 4, background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)', fontSize: 12,
            }}>Ctrl+V</kbd> 粘贴 {isVideo(accept) ? '视频' : '图片'}
          </span>
          {encoding && (
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>⏳ 编码中…</span>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && <div style={errorCss}>{error}</div>}

      {/* 预览 */}
      {previewUrl && !error && (
        <div style={previewWrapperCss}>
          {isVideoPreview ? (
            <div style={fileInfoCss}>
              📹 视频已加载 · {previewUrl.length.toLocaleString()} 字符
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="预览"
              style={previewImgCss}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <button
            type="button"
            style={{ ...layout.btn, ...layout.btnSmall, color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => onChange('')}
          >
            清除
          </button>
        </div>
      )}
    </div>
  );
};
