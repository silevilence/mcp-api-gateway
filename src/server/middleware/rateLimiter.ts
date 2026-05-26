// ============================================================
// 全局并发限流中间件 · 14 QPS 阈值限额
// ============================================================
import type { Request, Response, NextFunction } from 'express';

interface WindowEntry {
  timestamps: number[];
}

const WINDOW_MS = 1000;  // 1 秒滑动窗口
const MAX_REQUESTS = 14; // 14 QPS 阈值

const clients = new Map<string, WindowEntry>();

/** 定期清理过期客户端记录（每 30 秒） */
const CLEANUP_INTERVAL = 30_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clients) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
      if (entry.timestamps.length === 0) {
        clients.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  startCleanup();

  // 使用 IP 作为客户端标识
  const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();

  let entry = clients.get(clientIp);
  if (!entry) {
    entry = { timestamps: [] };
    clients.set(clientIp, entry);
  }

  // 移除窗口外的请求记录
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    res.status(429).json({
      code: 429,
      message: '请求过于频繁，请稍后再试',
      data: null,
    });
    return;
  }

  entry.timestamps.push(now);
  next();
}

/** 手动触发清理（供测试使用） */
export function resetRateLimiter(): void {
  clients.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
