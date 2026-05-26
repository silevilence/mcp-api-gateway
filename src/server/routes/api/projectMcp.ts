// ============================================================
// /api 命名空间 · 项目级 MCP 端点路由
// 端点: /api/:slug/mcp
// ============================================================
import { Router, type Request, type Response } from 'express';
import { mcpGuard } from '../../middleware/mcpGuard.js';
import { handleProjectMcpRequest } from '../../services/projectMcpService.js';

export const projectMcpRouter = Router({ mergeParams: true });

// 所有请求经过守卫校验
projectMcpRouter.use(mcpGuard);

// POST /api/:slug/mcp —— MCP 协议通信
projectMcpRouter.post('/', (req: Request, res: Response) => {
  handleProjectMcpRequest(req, res);
});

// GET /api/:slug/mcp —— 按 MCP 规范返回 405
projectMcpRouter.get('/', (_req: Request, res: Response) => {
  res.status(405).set('Allow', 'POST').json({
    code: 405,
    message: 'Method Not Allowed: MCP Streamable HTTP 仅支持 POST 请求',
    data: null,
  });
});

// DELETE /api/:slug/mcp —— 按 MCP 规范返回 405
projectMcpRouter.delete('/', (_req: Request, res: Response) => {
  res.status(405).set('Allow', 'POST').json({
    code: 405,
    message: 'Method Not Allowed',
    data: null,
  });
});
