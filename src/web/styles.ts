// ============================================================
// 通用样式 · 与现有视觉风格保持一致
// ============================================================

export const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  nav: {
    display: 'flex',
    gap: 4,
    marginBottom: 24,
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: 0,
  },
  navLink: {
    padding: '8px 16px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    fontSize: 14,
    fontWeight: 500,
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    transition: 'color 0.15s, border-color 0.15s',
  },
  navLinkActive: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 12px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: 600,
    color: '#374151',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle' as const,
  },
  btn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    transition: 'background 0.15s',
  },
  btnPrimary: {
    background: '#2563eb',
    color: '#fff',
    borderColor: '#2563eb',
  },
  btnDanger: {
    color: '#dc2626',
    borderColor: '#fecaca',
    background: '#fef2f2',
  },
  btnSmall: {
    padding: '4px 10px',
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    background: '#fff',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    minHeight: 80,
    resize: 'vertical' as const,
    fontFamily: 'monospace',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  badgeGreen: {
    background: '#d1fae5',
    color: '#065f46',
  },
  badgeBlue: {
    background: '#dbeafe',
    color: '#1e40af',
  },
  badgeGray: {
    background: '#f3f4f6',
    color: '#6b7280',
  },
  badgeRed: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  flexRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 20,
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    minWidth: 480,
    maxWidth: '90vw',
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  toast: {
    position: 'fixed' as const,
    top: 20,
    right: 20,
    zIndex: 200,
    padding: '12px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    animation: 'slideIn 0.3s ease',
  },
  toastSuccess: {
    background: '#d1fae5',
    color: '#065f46',
  },
  toastError: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  methodGet: {
    color: '#059669',
    fontWeight: 700,
  },
  methodPost: {
    color: '#2563eb',
    fontWeight: 700,
  },
  methodPut: {
    color: '#d97706',
    fontWeight: 700,
  },
  methodDelete: {
    color: '#dc2626',
    fontWeight: 700,
  },
  methodPatch: {
    color: '#7c3aed',
    fontWeight: 700,
  },
  hiddenRow: {
    opacity: 0.5,
  },
};

export function methodStyle(method: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    GET: styles.methodGet,
    POST: styles.methodPost,
    PUT: styles.methodPut,
    DELETE: styles.methodDelete,
    PATCH: styles.methodPatch,
  };
  return map[method] ?? {};
}
