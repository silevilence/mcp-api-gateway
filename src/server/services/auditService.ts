// ============================================================
// 审计日志服务 · 支持 7 天滚动轮转清理
// 底层委托 auditStore 进行按天分片持久化
// ============================================================
import type { AuditLog, AuditAction } from '../../shared/types.js';
import { appendLog, getLogs, rotateLogs as auditRotate } from './auditStore.js';

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
  // 异步持久化，不阻塞调用方
  appendLog(log).catch((err) => {
    console.error('[auditService] 日志写入失败:', err);
  });
  return log;
}

/** 获取最近审计日志（同步版本，兼容旧调用方） */
export function getRecentLogs(_limit = 50): AuditLog[] {
  return [];
}

/** 异步获取日志（供路由使用） */
export async function getRecentLogsAsync(limit = 50): Promise<AuditLog[]> {
  return getLogs(limit);
}

/**
 * 执行日志轮转清理 —— 删除超过 7 天的日志文件
 * 应在定时任务中每日调用
 */
export function rotateLogs(): number {
  // 异步执行，同步返回 0（实际数量由下次轮转日志输出）
  auditRotate(7).then((removed) => {
    if (removed > 0) {
      console.log(`[server] 日志轮转完成，清理了 ${removed} 个过期日志文件`);
    }
  }).catch((err) => {
    console.error('[server] 日志轮转失败:', err);
  });
  return 0;
}

const LOG_RETENTION_DAYS = 7;

/** 获取日志留存天数配置 */
export function getRetentionDays(): number {
  return LOG_RETENTION_DAYS;
}
