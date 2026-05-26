// ============================================================
// /api 命名空间 · MCP 端点路由
// ============================================================
import { Router, type Request, type Response } from 'express';
import { handleMpcRequest } from '../../services/mcpService.js';

export const mcpRouter = Router();

// POST /api/mcp —— MCP 协议通信
mcpRouter.post('/', (req: Request, res: Response) => {
  handleMpcRequest(req, res);
});

// GET /api/mcp —— 按 MCP 规范返回 405
mcpRouter.get('/', (_req: Request, res: Response) => {
  res.status(405).set('Allow', 'POST').json({
    code: 405,
    message: 'Method Not Allowed: MCP Streamable HTTP 仅支持 POST 请求',
    data: null,
  });
});

// DELETE /api/mcp —— 按 MCP 规范返回 405
mcpRouter.delete('/', (_req: Request, res: Response) => {
  res.status(405).set('Allow', 'POST').json({
    code: 405,
    message: 'Method Not Allowed',
    data: null,
  });
});
