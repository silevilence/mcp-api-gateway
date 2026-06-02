// ============================================================
// 核心工作台页面 · 全局看板
// ============================================================
import React, { useEffect, useState } from 'react';
import { layout } from '../styles.js';
import { projectsApi, nodesApi, healthApi } from '../apiClient.js';
import { AuditLogViewer } from '../components/AuditLogViewer.js';
import type { ApiProject, ApiNode } from '../../shared/types.js';

interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
}

const statCards = [
  { key: 'projects', label: '项目总数', icon: '⊞', color: 'var(--accent)' },
  { key: 'nodes', label: '活跃节点', icon: '⬡', color: 'var(--success)' },
  { key: 'custom', label: '自定义项目', icon: '⚙', color: 'var(--purple)' },
  { key: 'openapi', label: 'OpenAPI 项目', icon: '☰', color: 'var(--warning)' },
  { key: 'filesystem', label: '文件系统项目', icon: '📁', color: 'var(--purple)' },
];

export const DashboardPage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [loaded, setLoaded] = useState(false);

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
        setLoaded(true);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const visibleNodes = nodes.filter((n) => !n.hidden);
  const customProjects = projects.filter((p) => p.type === 'custom');
  const openapiProjects = projects.filter((p) => p.type === 'openapi');
  const filesystemProjects = projects.filter((p) => p.type === 'filesystem');

  const stats: Record<string, number> = {
    projects: projects.length,
    nodes: visibleNodes.length,
    custom: customProjects.length,
    openapi: openapiProjects.length,
    filesystem: filesystemProjects.length,
  };

  return (
    <div>
      <h1 style={layout.pageTitle}>工作台</h1>
      <p style={layout.pageSubtitle}>API 网关运行概览与系统状态监控</p>

      {error && (
        <div style={{
          padding: '12px 16px', background: 'var(--danger-soft)',
          borderRadius: 'var(--radius-md)', marginBottom: 24,
          color: 'var(--danger)', fontSize: 13, border: '1px solid var(--danger)',
        }}>
          连接失败：{error}
        </div>
      )}

      {/* 统计卡片 */}
      <div style={layout.statsGrid}>
        {statCards.map((sc, i) => (
          <div
            key={sc.key}
            style={{
              ...layout.statCard,
              animation: loaded ? `fadeInUp 0.3s ease ${i * 0.08}s both` : undefined,
            }}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: sc.color, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            }} />
            <div style={layout.statIcon}>{sc.icon}</div>
            <div style={layout.statValue}>{stats[sc.key]}</div>
            <div style={layout.statLabel}>{sc.label}</div>
          </div>
        ))}
      </div>

      {/* 系统状态 */}
      {health && (
        <div style={layout.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>系统状态</h3>
          <div style={{ display: 'flex', gap: 32, fontSize: 13, flexWrap: 'wrap' }}>
            <span style={layout.flexRow}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: health.status === 'ok' ? 'var(--success)' : 'var(--danger)',
                display: 'inline-block',
              }} />
              状态：<span style={{ ...layout.badge, ...layout.badgeGreen }}>{health.status}</span>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              运行时间：<span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{Math.floor(health.uptime)}s</span>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              检查时间：<span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{health.timestamp}</span>
            </span>
          </div>
        </div>
      )}

      {/* 审计日志 */}
      <AuditLogViewer />
    </div>
  );
};
