// ============================================================
// 核心工作台页面 · 全局看板
// ============================================================
import React, { useEffect, useState } from 'react';
import { styles } from '../styles.js';
import { projectsApi, nodesApi, healthApi } from '../apiClient.js';
import { AuditLogViewer } from '../components/AuditLogViewer.js';
import type { ApiProject, ApiNode } from '../../shared/types.js';

interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
}

export const DashboardPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [nodes, setNodes] = useState<ApiNode[]>([]);

  useEffect(() => {
    Promise.all([
      healthApi.check().then((r) => (r.code === 0 ? r.data : null)),
      projectsApi.list().then((r) => (r.code === 0 ? r.data : [])),
      nodesApi.list().then((r) => (r.code === 0 ? r.data : [])),
    ])
      .then(([h, p, n]) => {
        setHealth(h);
        setProjects(p);
        setNodes(n);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const visibleNodes = nodes.filter((n) => !n.hidden);
  const customProjects = projects.filter((p) => p.type === 'custom');
  const openapiProjects = projects.filter((p) => p.type === 'openapi');

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px 0' }}>工作台</h1>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 8, marginBottom: 16, color: '#991b1b', fontSize: 14 }}>
          连接失败：{error}
        </div>
      )}

      {/* 统计卡片 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{projects.length}</div>
          <div style={styles.statLabel}>项目总数</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{visibleNodes.length}</div>
          <div style={styles.statLabel}>活跃节点</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{customProjects.length}</div>
          <div style={styles.statLabel}>自定义项目</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{openapiProjects.length}</div>
          <div style={styles.statLabel}>OpenAPI 项目</div>
        </div>
      </div>

      {/* 系统状态 */}
      {health && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>系统状态</h3>
          <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
            <span>
              状态：<span style={{ ...styles.badge, ...styles.badgeGreen }}>{health.status}</span>
            </span>
            <span>运行时间：{Math.floor(health.uptime)}s</span>
            <span>检查时间：{health.timestamp}</span>
          </div>
        </div>
      )}

      {/* 审计日志 */}
      <AuditLogViewer />
    </div>
  );
};
