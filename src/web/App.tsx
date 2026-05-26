// ============================================================
// 应用根组件
// ============================================================
import React from 'react';
import { DashboardPage } from './pages/DashboardPage.js';

export const App: React.FC = () => {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <DashboardPage />
    </main>
  );
};
