// ============================================================
// 审计日志查看器
// ============================================================
import React, { useEffect, useState } from 'react';
import { layout } from '../styles.js';
import { auditApi } from '../apiClient.js';
import type { AuditLog } from '../../shared/types.js';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.list(50);
      if (res.code === 0) setLogs(res.data);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const actionLabel = (action: string): { text: string; style: React.CSSProperties } => {
    switch (action) {
      case 'create': return { text: '创建', style: layout.badgeGreen };
      case 'update': return { text: '更新', style: layout.badgeBlue };
      case 'delete': return { text: '删除', style: layout.badgeRed };
      case 'archive': return { text: '归档', style: layout.badgeGray };
      case 'unarchive': return { text: '取消归档', style: layout.badgeGreen };
      case 'sync': return { text: '同步', style: layout.badgePurple };
      default: return { text: action, style: layout.badgeGray };
    }
  };

  return (
    <div style={layout.card}>
      <div style={layout.flexBetween}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>操作审计日志</h3>
        <button
          style={{ ...layout.btn, ...layout.btnSmall }}
          onClick={fetchLogs}
        >
          刷新
        </button>
      </div>
      {loading ? (
        <div style={{ padding: '24px 0' }}>
          <div className="skeleton" style={{ width: '100%', height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '80%', height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '60%', height: 16 }} />
        </div>
      ) : logs.length === 0 ? (
        <p style={{ ...layout.textMuted, textAlign: 'center', padding: '24px 0' }}>暂无操作记录</p>
      ) : (
        <table style={layout.table}>
          <thead>
            <tr>
              <th style={layout.th}>时间</th>
              <th style={layout.th}>操作</th>
              <th style={layout.th}>详情</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const action = actionLabel(log.action);
              return (
                <tr key={log.id}>
                  <td style={{ ...layout.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td style={layout.td}>
                    <span style={{ ...layout.badge, ...action.style }}>{action.text}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                      {log.targetType === 'project' ? '项目' : '节点'}
                    </span>
                  </td>
                  <td style={{ ...layout.td, fontSize: 13, color: 'var(--text-secondary)' }}>{log.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
