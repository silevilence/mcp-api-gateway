// ============================================================
// Toast 通知组件
// ============================================================
import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { layout } from '../styles.js';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={layout.toastContainer}>
        {toasts.map((t, i) => (
          <div
            key={t.id}
            style={{
              ...layout.toast,
              ...(t.type === 'success' ? layout.toastSuccess : layout.toastError),
              opacity: i === toasts.length - 1 ? 1 : 0.6,
            }}
          >
            <span style={{ marginRight: 6 }}>{t.type === 'success' ? '✓' : '✕'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
