// ============================================================
// 审计日志服务 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { createAuditLog, getRecentLogs, rotateLogs, getRetentionDays } from '../services/auditService.js';
import * as store from '../services/store.js';

describe('审计日志服务', () => {
  beforeEach(() => {
    store.clearAllData();
  });

  it('createAuditLog 应创建并持久化日志', () => {
    const log = createAuditLog('create', 'project', 'p1', '创建项目');
    expect(log.id).toBeDefined();
    expect(log.action).toBe('create');
    expect(log.targetType).toBe('project');

    const logs = getRecentLogs(10);
    expect(logs).toHaveLength(1);
  });

  it('getRecentLogs 应限制返回条数并倒序排列', () => {
    for (let i = 0; i < 5; i++) {
      createAuditLog('create', 'project', `p${i}`, `log ${i}`);
    }
    const logs = getRecentLogs(3);
    expect(logs).toHaveLength(3);
    // 倒序：最新的最先
    expect(logs[0].detail).toBe('log 4');
  });

  it('rotateLogs 应清理超过7天的日志', () => {
    // 手动插入过期日志
    const oldLog = {
      id: 'old',
      action: 'create' as const,
      targetType: 'project' as const,
      targetId: 'p1',
      detail: 'old',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    store.appendAuditLog(oldLog);

    // createAuditLog 内部已 append 到 store
    const newLog = createAuditLog('create', 'project', 'p2', 'new');

    const removed = rotateLogs();
    expect(removed).toBe(1);

    const remaining = getRecentLogs(10);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(newLog.id);
  });

  it('getRetentionDays 应返回 7', () => {
    expect(getRetentionDays()).toBe(7);
  });
});
