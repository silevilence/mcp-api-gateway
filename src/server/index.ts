// ============================================================
// mcp-api-gateway · 后端服务入口
// ============================================================
import express from 'express';
import {
  healthRouter,
  projectRouter,
  nodeRouter,
  openapiRouter,
  auditRouter,
  apiProjectRouter,
  apiNodeRouter,
  apiAuditRouter,
  mcpRouter,
} from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { rotateLogs } from './services/auditService.js';

const PORT = process.env.PORT ?? 3000;

const app = express();

// ---- 全局中间件 ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(rateLimiter);

// ---- 路由注册 (/internal 前缀 · 内部管理接口) ----
app.use('/internal', healthRouter);
app.use('/internal/projects', projectRouter);
app.use('/internal/nodes', nodeRouter);
app.use('/internal/openapi', openapiRouter);
app.use('/internal/audit-logs', auditRouter);

// ---- 路由注册 (/api 前缀 · 外部暴露接口) ----
app.use('/api/projects', apiProjectRouter);
app.use('/api/nodes', apiNodeRouter);
app.use('/api/audit-logs', apiAuditRouter);
app.use('/api/mcp', mcpRouter);

// ---- 全局错误处理 ----
app.use(errorHandler);

// ---- 定时任务：每日日志轮转 (7 天保留) ----
const LOG_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 小时
setInterval(() => {
  const removed = rotateLogs();
  if (removed > 0) {
    console.log(`[server] 日志轮转完成，清理了 ${removed} 条过期审计日志`);
  }
}, LOG_ROTATION_INTERVAL);

// ---- 服务启动 ----
app.listen(PORT, () => {
  console.log(`[server] API Gateway 已启动 → http://localhost:${PORT}`);
  console.log(`[server] 内部管理接口 → /internal/*`);
  console.log(`[server] 外部 API 接口 → /api/*`);
  console.log(`[server] MCP 端点     → /api/mcp`);
});

export default app;
