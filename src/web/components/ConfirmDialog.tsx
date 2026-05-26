// ============================================================
// 确认弹窗组件
// ============================================================
import React from 'react';
import { createPortal } from 'react-dom';
import { layout } from '../styles.js';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = '确认',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  return createPortal(
    <div style={layout.modalOverlay} onClick={onCancel}>
      <div style={{ ...layout.modalContent, minWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center', opacity: 0.6 }}>
          {danger ? '⚠' : 'ℹ'}
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, textAlign: 'center' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
          {message}
        </p>
        <div style={{ ...layout.flexRow, justifyContent: 'center', gap: 12 }}>
          <button style={layout.btn} onClick={onCancel}>取消</button>
          <button
            style={{
              ...layout.btn,
              ...(danger ? layout.btnDanger : layout.btnPrimary),
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
