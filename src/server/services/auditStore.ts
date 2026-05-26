// ============================================================
// 审计日志持久层 · 按天分片 JSON 存储
// ============================================================
import { readFile, writeFile, mkdir, unlink, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AuditLog } from '../../shared/types.js';
import { getDataDir } from './persistence.js';

// ---- 路径 ----
const AUDIT_DIR = join(getDataDir(), 'audit-logs');

// ---- 内存缓存 ----
let logs: AuditLog[] = [];
let loaded = false;

/** 获取当天日期字符串 */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 获取日志文件路径 */
function logFilePath(date: string): string {
  return join(AUDIT_DIR, `${date}.json`);
}

// ---- 初始化 ----
async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  await mkdir(AUDIT_DIR, { recursive: true });

  const filePath = logFilePath(todayStr());
  if (existsSync(filePath)) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      logs = JSON.parse(raw) as AuditLog[];
    } catch {
      console.warn('[auditStore] ⚠️ 今日日志文件损坏，使用空日志');
      logs = [];
    }
  } else {
    logs = [];
  }
  loaded = true;
}

// ---- 写入日志 ----
async function flushLogs(): Promise<void> {
  await mkdir(AUDIT_DIR, { recursive: true });
  const filePath = logFilePath(todayStr());
  await writeFile(filePath, JSON.stringify(logs, null, 2));
}

export async function appendLog(log: AuditLog): Promise<void> {
  await ensureLoaded();
  logs.push(log);
  // 异步刷盘，不阻塞调用方
  flushLogs().catch((err) => {
    console.error('[auditStore] 日志写入失败:', err);
  });
}

// ---- 查询日志 ----
export async function getLogs(limit = 50): Promise<AuditLog[]> {
  await ensureLoaded();
  return logs.slice(-limit).reverse();
}

// ---- 日志轮转 ----
export async function rotateLogs(retentionDays = 7): Promise<number> {
  await mkdir(AUDIT_DIR, { recursive: true });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let removed = 0;

  try {
    const files = await readdir(AUDIT_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const dateStr = file.replace('.json', '');
      // 只处理合法日期格式的文件
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      if (dateStr < cutoffStr) {
        await unlink(join(AUDIT_DIR, file));
        removed++;
      }
    }
  } catch (err) {
    console.error('[auditStore] 日志轮转失败:', err);
  }

  if (removed > 0) {
    console.log(`[auditStore] 日志轮转完成，清理了 ${removed} 个过期日志文件`);
  }

  return removed;
}

// ---- 测试用 ----
export async function clearLogs(): Promise<void> {
  logs = [];
  loaded = false;
}
