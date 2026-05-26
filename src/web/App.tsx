// ============================================================
// 应用根组件 · 单页路由 & 导航
// ============================================================
import React, { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { NodesPage } from './pages/NodesPage.js';
import { ToastProvider } from './components/Toast.js';
import { styles } from './styles.js';
import type { ApiProject } from '@shared/types.js';

type View = 'dashboard' | 'projects' | 'nodes';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);

  const navigateToProjects = () => {
    setSelectedProject(null);
    setView('projects');
  };

  const navigateToNodes = (project: ApiProject) => {
    setSelectedProject(project);
    setView('nodes');
  };

  const navigateToDashboard = () => {
    setSelectedProject(null);
    setView('dashboard');
  };

  const navLinkStyle = (target: View): React.CSSProperties => ({
    ...styles.navLink,
    ...(view === target ? styles.navLinkActive : {}),
  });

  return (
    <ToastProvider>
      <main style={styles.container}>
        {/* 顶部导航栏 */}
        <nav style={styles.nav}>
          <button style={navLinkStyle('dashboard')} onClick={navigateToDashboard}>
            工作台
          </button>
          <button style={navLinkStyle('projects')} onClick={navigateToProjects}>
            API 项目集
          </button>
          {view === 'nodes' && selectedProject && (
            <button style={{ ...styles.navLink, ...styles.navLinkActive }}>
              节点 · {selectedProject.name}
            </button>
          )}
        </nav>

        {/* 视图切换 */}
        {view === 'dashboard' && <DashboardPage />}
        {view === 'projects' && (
          <ProjectsPage onSelectProject={navigateToNodes} />
        )}
        {view === 'nodes' && selectedProject && (
          <NodesPage
            project={selectedProject}
            onBack={navigateToProjects}
          />
        )}
      </main>
    </ToastProvider>
  );
};
