// ============================================================
// 确认弹窗组件
// ============================================================
import React from 'react';
import { styles } from '../styles.js';

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
  return (
    <div style={styles.modal} onClick={onCancel}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 18 }}>{title}</h3>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>{message}</p>
        <div style={{ ...styles.flexRow, justifyContent: 'flex-end' }}>
          <button style={styles.btn} onClick={onCancel}>取消</button>
          <button
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              ...(danger ? styles.btnDanger : {}),
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
