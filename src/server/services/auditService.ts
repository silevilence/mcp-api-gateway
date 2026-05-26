// ============================================================
// 审计日志服务 · 支持 7 天滚动轮转清理
// ============================================================
import type { AuditLog, AuditAction } from '../../shared/types.js';
import * as store from './store.js';

const LOG_RETENTION_DAYS = 7;

function newId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

/** 创建一条审计日志 */
export function createAuditLog(
  action: AuditAction,
  targetType: 'project' | 'node',
  targetId: string,
  detail: string,
): AuditLog {
  const log: AuditLog = {
    id: newId(),
    action,
    targetType,
    targetId,
    detail,
    timestamp: now(),
  };
  store.appendAuditLog(log);
  return log;
}

/** 获取最近审计日志 */
export function getRecentLogs(limit = 50): AuditLog[] {
  return store.getAuditLogs(limit);
}

/**
 * 执行日志轮转清理 —— 删除超过 7 天的日志
 * 应在定时任务中每日调用
 */
export function rotateLogs(): number {
  const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return store.removeAuditLogsOlderThan(cutoff);
}

/** 获取日志留存天数配置 */
export function getRetentionDays(): number {
  return LOG_RETENTION_DAYS;
}
