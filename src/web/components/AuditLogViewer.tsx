// ============================================================
// 审计日志查看器
// ============================================================
import React, { useEffect, useState } from 'react';
import { styles } from '../styles.js';
import { auditApi } from '../apiClient.js';
import type { AuditLog } from '../../shared/types.js';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.list(50);
      if (res.code === 0) {
        setLogs(res.data);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionLabel = (action: string): { text: string; style: React.CSSProperties } => {
    switch (action) {
      case 'create': return { text: '创建', style: styles.badgeGreen };
      case 'update': return { text: '更新', style: styles.badgeBlue };
      case 'delete': return { text: '删除', style: styles.badgeRed };
      case 'archive': return { text: '归档', style: styles.badgeGray };
      case 'unarchive': return { text: '取消归档', style: styles.badgeGreen };
      case 'sync': return { text: '同步', style: styles.badgeBlue };
      default: return { text: action, style: styles.badgeGray };
    }
  };

  return (
    <div style={styles.card}>
      <div style={{ ...styles.flexRow, justifyContent: 'space-between' }}>
        <h3 style={styles.cardTitle}>操作审计日志</h3>
        <button style={{ ...styles.btn, ...styles.btnSmall }} onClick={fetchLogs}>刷新</button>
      </div>
      {loading ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>加载中…</p>
      ) : logs.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>暂无操作记录</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>时间</th>
              <th style={styles.th}>操作</th>
              <th style={styles.th}>详情</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const action = actionLabel(log.action);
              return (
                <tr key={log.id}>
                  <td style={styles.td}>{new Date(log.timestamp).toLocaleString('zh-CN')}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...action.style }}>{action.text}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 6 }}>
                      {log.targetType === 'project' ? '项目' : '节点'}
                    </span>
                  </td>
                  <td style={styles.td}>{log.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
