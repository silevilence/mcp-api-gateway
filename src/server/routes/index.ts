// ============================================================
// 路由统一导出 (Barrel Export)
// ============================================================
export { healthRouter } from './health.js';
export { projectRouter } from './projects.js';
export { nodeRouter } from './nodes.js';
export { openapiRouter } from './openapi.js';
export { auditRouter } from './audit.js';

// /api 命名空间路由
export { apiProjectRouter, apiNodeRouter, apiAuditRouter, mcpRouter } from './api/index.js';
