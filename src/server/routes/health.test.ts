// ============================================================
// 健康检查路由 · 单元测试
// ============================================================
import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import { handleHealth } from './health.js';

describe('handleHealth', () => {
  it('应返回 code=0 且 status 为 healthy', () => {
    let captured: unknown = null;

    const mockReq = {} as Request;

    const mockRes = {
      json(data: unknown) {
        captured = data;
        return this;
      },
    } as unknown as Response;

    handleHealth(mockReq, mockRes);

    expect(captured).toBeDefined();
    const body = captured as Record<string, unknown>;
    expect(body.code).toBe(0);
    expect(body.message).toBe('ok');
    expect((body.data as Record<string, unknown>).status).toBe('healthy');
  });
});
