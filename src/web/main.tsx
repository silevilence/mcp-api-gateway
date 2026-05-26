// ============================================================
// mcp-api-gateway · 前端入口
// ============================================================
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { CSS_VARS, globalCSS } from './styles.js';

// 注入 CSS 自定义属性
const rootEl = document.documentElement;
for (const [key, value] of Object.entries(CSS_VARS)) {
  rootEl.style.setProperty(key, value);
}

// 注入全局样式表
const styleEl = document.createElement('style');
styleEl.textContent = globalCSS();
document.head.appendChild(styleEl);

const container = document.getElementById('root');
if (!container) {
  throw new Error('未找到根节点 #root，请检查 index.html');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
