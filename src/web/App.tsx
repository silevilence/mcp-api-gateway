// ============================================================
// 应用根组件 · 侧边栏导航 + 视图路由
// ============================================================
import React, { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { NodesPage } from './pages/NodesPage.js';
import { ToastProvider } from './components/Toast.js';
import { layout } from './styles.js';
import type { ApiProject } from '@shared/types.js';

type View = 'dashboard' | 'projects' | 'nodes';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);

  const navigate = (v: View, project?: ApiProject) => {
    if (v === 'nodes' && project) setSelectedProject(project);
    else setSelectedProject(null);
    setView(v);
  };

  const sidebarItemStyle = (target: View): React.CSSProperties => ({
    ...layout.sidebarItem,
    ...(view === target ? layout.sidebarItemActive : {}),
  });

  return (
    <ToastProvider>
      <div style={layout.app}>
        {/* 侧边栏 */}
        <aside style={layout.sidebar}>
          <div style={layout.sidebarLogo}>
            <div style={layout.sidebarLogoIcon}>⚡</div>
            <span style={layout.sidebarLogoText}>API Gateway</span>
          </div>

          <nav style={layout.sidebarNav}>
            <button style={sidebarItemStyle('dashboard')} onClick={() => navigate('dashboard')}>
              <span style={layout.sidebarItemIcon}>⊞</span>
              工作台
            </button>
            <button style={sidebarItemStyle('projects')} onClick={() => navigate('projects')}>
              <span style={layout.sidebarItemIcon}>⊟</span>
              API 项目集
            </button>
            {view === 'nodes' && selectedProject && (
              <button style={{ ...layout.sidebarItem, ...layout.sidebarItemActive }}>
                <span style={layout.sidebarItemIcon}>↳</span>
                {selectedProject.name}
              </button>
            )}
          </nav>

          <div style={layout.sidebarFooter}>
            MCP API Gateway v1.0
          </div>
        </aside>

        {/* 主内容区 */}
        <main style={layout.main}>
          <div className="animate-fade-in" key={view + (selectedProject?.id ?? '')}>
            {view === 'dashboard' && <DashboardPage />}
            {view === 'projects' && (
              <ProjectsPage onSelectProject={(p) => navigate('nodes', p)} />
            )}
            {view === 'nodes' && selectedProject && (
              <NodesPage
                project={selectedProject}
                onBack={() => navigate('projects')}
              />
            )}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};
