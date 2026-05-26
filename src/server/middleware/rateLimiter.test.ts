// ============================================================
// 限流中间件 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimiter, resetRateLimiter } from '../middleware/rateLimiter.js';
import type { Request, Response } from 'express';

function mockReq(ip = '127.0.0.1'): Request {
  return { ip, socket: { remoteAddress: ip } } as unknown as Request;
}

function mockRes(): { res: Response; getStatus: () => number; getBody: () => unknown } {
  let statusCode = 200;
  let body: unknown = null;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: unknown) {
      body = data;
      return res;
    },
  } as unknown as Response;
  return { res, getStatus: () => statusCode, getBody: () => body };
}

describe('rateLimiter 限流中间件', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('正常情况下应放行请求', () => {
    const { res, getStatus } = mockRes();
    let nextCalled = false;
    rateLimiter(mockReq(), res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(getStatus()).toBe(200);
  });

  it('超过 14 QPS 后应返回 429', () => {
    const { res } = mockRes();

    // 发送 14 个请求（刚好在限额内）
    for (let i = 0; i < 14; i++) {
      rateLimiter(mockReq(), res, () => {});
    }

    // 第 15 个请求应被拒绝
    let nextCalled = false;
    const { res: res2, getStatus, getBody } = mockRes();
    rateLimiter(mockReq(), res2 as Response, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(getStatus()).toBe(429);
    expect(getBody()).toBeDefined();
  });

  it('不同 IP 应有独立的限流窗口', () => {
    const { res: res1 } = mockRes();
    const { res: res2 } = mockRes();
    const ip2Req = mockReq('10.0.0.1');

    // IP1 刷满 14 QPS
    for (let i = 0; i < 14; i++) {
      rateLimiter(mockReq(), res1, () => {});
    }

    // IP2 应不受影响
    let nextCalled = false;
    rateLimiter(ip2Req, res2, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
