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
  sandboxRouter,
  fileSystemRouter,
  projectMcpRouter,
  settingsRouter,
  visionRouter,
} from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { rotateLogs } from './services/auditService.js';
import * as store from './services/store.js';
import { initSettings } from './services/settingsStore.js';

const PORT = process.env.PORT ?? 3000;

const app = express();

// ---- 全局中间件 ----
// 16MB limit 适配 Base64 编码的图片/视频上传
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: true, limit: '16mb' }));
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
app.use('/api/sandbox', sandboxRouter);
app.use('/api/filesystem', fileSystemRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/vision', visionRouter);
// 项目级 MCP：动态路由 /api/:slug/mcp（必须在所有 /api/* 路由之后）
app.use('/api/:slug/mcp', projectMcpRouter);

// ---- 生产环境：托管前端 SPA 静态资源（在所有 API 路由之后注册）----
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('public'));
  // SPA fallback：所有非 API 请求返回 index.html
  app.get('*', (_req, res) => {
    res.sendFile('index.html', { root: 'public' });
  });
}

// ---- 全局错误处理 ----
app.use(errorHandler);

// ---- 定时任务：每日日志轮转 (7 天保留) ----
const LOG_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 小时
setInterval(() => {
  rotateLogs();
}, LOG_ROTATION_INTERVAL);

// ---- 启动：先加载持久化数据，再监听端口 ----
(async () => {
  await store.init();
  await initSettings();

  app.listen(PORT, () => {
    console.log(`[server] API Gateway 已启动 → http://localhost:${PORT}`);
    console.log(`[server] 内部管理接口 → /internal/*`);
    console.log(`[server] 外部 API 接口 → /api/*`);
    console.log(`[server] MCP 端点     → /api/mcp`);
  });
})();

export default app;
