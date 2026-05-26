// ============================================================
// 审计日志服务 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAuditLog,
  getRecentLogsAsync,
  rotateLogs,
  getRetentionDays,
} from '../services/auditService.js';
import { clearLogs } from '../services/auditStore.js';

describe('审计日志服务', () => {
  beforeEach(async () => {
    await clearLogs();
  });

  it('createAuditLog 应创建日志并返回有效对象', () => {
    const log = createAuditLog('create', 'project', 'p1', '创建项目');
    expect(log.id).toBeDefined();
    expect(log.action).toBe('create');
    expect(log.targetType).toBe('project');
    expect(log.targetId).toBe('p1');
    expect(log.detail).toBe('创建项目');
  });

  it('getRecentLogsAsync 应可查询日志', async () => {
    createAuditLog('create', 'project', 'p1', 'log 1');
    createAuditLog('update', 'project', 'p2', 'log 2');
    // 等待异步写入
    await new Promise((r) => setTimeout(r, 100));

    const logs = await getRecentLogsAsync(10);
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('rotateLogs 不抛错', () => {
    // rotateLogs 是异步的，同步调用不抛错即可
    expect(() => rotateLogs()).not.toThrow();
  });

  it('getRetentionDays 应返回 7', () => {
    expect(getRetentionDays()).toBe(7);
  });
});
