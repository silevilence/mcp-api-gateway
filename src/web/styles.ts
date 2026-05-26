// ============================================================
// 暗黑模式 · 极简科技感设计系统
// ============================================================

/** CSS 自定义属性（通过 main.tsx 注入全局样式表） */
export const CSS_VARS = {
  '--bg-root': '#06060b',
  '--bg-surface': '#0d0d15',
  '--bg-card': '#13131f',
  '--bg-elevated': '#1a1a2b',
  '--bg-input': '#0f0f1a',
  '--border-default': '#252538',
  '--border-muted': '#1c1c2e',
  '--border-accent': '#00d4ff33',
  '--text-primary': '#e4e4ed',
  '--text-secondary': '#8888a0',
  '--text-muted': '#5c5c72',
  '--accent': '#00d4ff',
  '--accent-soft': '#00d4ff1a',
  '--accent-glow': '#00d4ff66',
  '--success': '#00e676',
  '--success-soft': '#00e6761a',
  '--warning': '#f59e0b',
  '--warning-soft': '#f59e0b1a',
  '--danger': '#ff4466',
  '--danger-soft': '#ff44661a',
  '--purple': '#a855f7',
  '--purple-soft': '#a855f71a',
  '--radius-sm': '6px',
  '--radius-md': '10px',
  '--radius-lg': '14px',
  '--radius-xl': '20px',
  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.4)',
  '--shadow-md': '0 4px 16px rgba(0,0,0,0.5)',
  '--shadow-lg': '0 8px 32px rgba(0,0,0,0.6)',
  '--shadow-glow': '0 0 20px var(--accent-soft)',
  '--font-sans': "'Inter', system-ui, -apple-system, sans-serif",
  '--font-mono': "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  '--transition-fast': '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  '--transition-base': '220ms cubic-bezier(0.4, 0, 0.2, 1)',
  '--transition-slow': '350ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/** 注入全局基础样式 */
export function globalCSS(): string {
  return /* css */ `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      font-family: var(--font-sans);
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      background: var(--bg-root);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.6;
    }

    /* 滚动条 */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

    /* 选中 */
    ::selection { background: var(--accent-soft); color: var(--accent); }

    /* 聚焦 */
    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    /* 链接/按钮重置 */
    button { font-family: inherit; cursor: pointer; }
    input, select, textarea { font-family: inherit; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* 代码 */
    code {
      font-family: var(--font-mono);
      font-size: 0.85em;
      background: var(--bg-input);
      padding: 0.15em 0.4em;
      border-radius: 4px;
    }

    /* 输入框聚焦效果 */
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent) !important;
      box-shadow: 0 0 0 3px var(--accent-soft);
      outline: none;
    }

    /* 按钮 hover */
    button:hover { filter: brightness(1.1); }
    button:active { transform: scale(0.98); }

    /* 表格行 hover */
    tbody tr:hover { background: var(--bg-elevated); }

    /* 关键帧 */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes shimmer {
      0%   { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }

    .animate-fade-in     { animation: fadeIn 0.22s ease forwards; }
    .animate-fade-in-up  { animation: fadeInUp 0.22s ease forwards; }
    .animate-scale-in    { animation: scaleIn 0.2s ease forwards; }
    .animate-slide-right { animation: slideInRight 0.22s ease forwards; }
    .animate-slide-left  { animation: slideInLeft 0.22s ease forwards; }

    .skeleton {
      background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--border-default) 50%, var(--bg-elevated) 75%);
      background-size: 200px 100%;
      animation: shimmer 1.5s infinite linear;
      border-radius: var(--radius-sm);
    }
  `;
}

// ============================================================
// 组件样式工具
// ============================================================

function s(style: React.CSSProperties): React.CSSProperties {
  return style;
}

export const layout = {
  // ---- 应用布局 ----
  app: s({ display: 'flex', minHeight: '100vh' }),
  sidebar: s({
    width: 240, minWidth: 240, background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-default)', display: 'flex',
    flexDirection: 'column', padding: '24px 16px', position: 'sticky',
    top: 0, height: '100vh', zIndex: 10,
  }),
  sidebarLogo: s({
    display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 24px',
    marginBottom: 8, borderBottom: '1px solid var(--border-muted)',
  }),
  sidebarLogoIcon: s({
    width: 34, height: 34, borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, var(--accent), var(--purple))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 700, color: '#fff',
  }),
  sidebarLogoText: s({
    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em',
  }),
  sidebarNav: s({ display: 'flex', flexDirection: 'column', gap: 2 }),
  sidebarItem: s({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500,
    color: 'var(--text-secondary)', background: 'transparent', border: 'none',
    cursor: 'pointer', transition: 'all var(--transition-fast)', textAlign: 'left', width: '100%',
  }),
  sidebarItemActive: s({ color: 'var(--accent)', background: 'var(--accent-soft)' }),
  sidebarItemIcon: s({
    width: 20, height: 20, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 16, flexShrink: 0,
  }),
  sidebarDivider: s({ border: 'none', borderTop: '1px solid var(--border-muted)', margin: '8px 0' }),
  sidebarFooter: s({
    marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-muted)',
    fontSize: 11, color: 'var(--text-muted)', padding: '12px 8px 0',
  }),
  main: s({ flex: 1, padding: '32px 40px', maxWidth: 1200, minWidth: 0 }),

  // ---- 页面标题 ----
  pageTitle: s({ fontSize: 26, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }),
  pageSubtitle: s({ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }),

  // ---- 卡片 ----
  card: s({
    background: 'var(--bg-card)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16,
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  }),
  cardHeader: s({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20, flexWrap: 'wrap', gap: 12,
  }),

  // ---- 统计卡片 ----
  statsGrid: s({
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16, marginBottom: 28,
  }),
  statCard: s({
    background: 'var(--bg-card)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)', padding: '20px 24px',
    position: 'relative', overflow: 'hidden',
  }),
  statValue: s({
    fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1,
    letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)',
  }),
  statLabel: s({ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }),
  statIcon: s({ position: 'absolute', top: 16, right: 16, fontSize: 22, opacity: 0.15 }),

  // ---- 表格 ----
  table: s({ width: '100%', borderCollapse: 'collapse', fontSize: 14 }),
  th: s({
    textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--border-default)',
    fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
  }),
  td: s({
    padding: '12px 14px', borderBottom: '1px solid var(--border-muted)', verticalAlign: 'middle',
  }),
  hiddenRow: s({ opacity: 0.4 }),

  // ---- 按钮 ----
  btn: s({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, transition: 'all var(--transition-fast)', whiteSpace: 'nowrap',
  }),
  btnPrimary: s({
    background: 'var(--accent)', color: '#06060b', borderColor: 'var(--accent)', fontWeight: 600,
  }),
  btnDanger: s({
    color: 'var(--danger)', borderColor: 'var(--danger-soft)', background: 'var(--danger-soft)',
  }),
  btnGhost: s({
    background: 'transparent', borderColor: 'transparent', color: 'var(--text-secondary)',
  }),
  btnSmall: s({ padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)' }),
  btnIcon: s({ padding: 6, minWidth: 32, justifyContent: 'center' }),

  // ---- 表单 ----
  formGroup: s({ marginBottom: 18 }),
  label: s({
    display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 6, gap: 4,
  }),
  input: s({
    width: '100%', padding: '9px 14px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 14,
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  }),
  select: s({
    width: '100%', padding: '9px 14px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer',
    transition: 'border-color var(--transition-fast)',
  }),
  textarea: s({
    width: '100%', padding: '9px 14px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 14, minHeight: 80,
    resize: 'vertical', fontFamily: 'var(--font-mono)',
    transition: 'border-color var(--transition-fast)',
  }),

  // ---- 徽章 ----
  badge: s({
    display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
    borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
  }),
  badgeGreen: s({ background: 'var(--success-soft)', color: 'var(--success)' }),
  badgeBlue: s({ background: 'var(--accent-soft)', color: 'var(--accent)' }),
  badgeGray: s({ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }),
  badgeRed: s({ background: 'var(--danger-soft)', color: 'var(--danger)' }),
  badgePurple: s({ background: 'var(--purple-soft)', color: 'var(--purple)' }),
  badgeAmber: s({ background: 'var(--warning-soft)', color: 'var(--warning)' }),

  // ---- 模态框 ----
  modalOverlay: s({
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(4px)', display: 'flex',
    justifyContent: 'center', zIndex: 100, overflow: 'auto',
    padding: '40px 20px', animation: 'fadeIn 0.15s ease',
  }),
  modalContent: s({
    background: 'var(--bg-card)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)', padding: 28, minWidth: 480,
    maxWidth: '92vw', maxHeight: 'calc(100vh - 80px)', overflow: 'auto',
    boxShadow: 'var(--shadow-lg)', animation: 'scaleIn 0.2s ease',
    margin: 'auto 0', boxSizing: 'border-box',
  }),

  // ---- Toast ----
  toastContainer: s({
    position: 'fixed', top: 20, right: 20, zIndex: 200,
    display: 'flex', flexDirection: 'column', gap: 8,
  }),
  toast: s({
    padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: 13,
    fontWeight: 500, boxShadow: 'var(--shadow-md)',
    animation: 'slideInRight 0.3s ease', border: '1px solid',
  }),
  toastSuccess: s({ background: 'var(--success-soft)', color: 'var(--success)', borderColor: 'var(--success)' }),
  toastError: s({ background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'var(--danger)' }),

  // ---- HTTP 方法 ----
  methodGet: s({ color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }),
  methodPost: s({ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }),
  methodPut: s({ color: 'var(--warning)', fontWeight: 700, fontFamily: 'var(--font-mono)' }),
  methodDelete: s({ color: 'var(--danger)', fontWeight: 700, fontFamily: 'var(--font-mono)' }),
  methodPatch: s({ color: 'var(--purple)', fontWeight: 700, fontFamily: 'var(--font-mono)' }),

  // ---- 辅助 ----
  flexRow: s({ display: 'flex', gap: 8, alignItems: 'center' }),
  flexBetween: s({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }),
  textMuted: s({ color: 'var(--text-muted)', fontSize: 13 }),
  textSecondary: s({ color: 'var(--text-secondary)', fontSize: 13 }),
  divider: s({ border: 'none', borderTop: '1px solid var(--border-muted)', margin: '16px 0' }),
  emptyState: s({ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 14 }),
  tag: s({
    display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-sm)',
    fontSize: 11, fontWeight: 600, background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
  }),
  link: s({ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500, background: 'none', border: 'none', fontSize: 'inherit', padding: 0 }),
};

/** HTTP 方法样式映射 */
export function methodStyle(method: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    GET: layout.methodGet,
    POST: layout.methodPost,
    PUT: layout.methodPut,
    DELETE: layout.methodDelete,
    PATCH: layout.methodPatch,
  };
  return map[method] ?? {};
}

/** 兼容旧代码 */
export const styles = layout;

