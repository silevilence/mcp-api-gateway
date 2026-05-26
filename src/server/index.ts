// ============================================================
// mcp-api-gateway · 后端服务入口
// ============================================================
import express from 'express';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const PORT = process.env.PORT ?? 3000;

const app = express();

// ---- 全局中间件 ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ---- 路由注册 ----
app.use('/internal', healthRouter);

// ---- 全局错误处理 ----
app.use(errorHandler);

// ---- 服务启动 ----
app.listen(PORT, () => {
  console.log(`[server] API Gateway 已启动 → http://localhost:${PORT}`);
});

export default app;
