// ============================================================
// /api 命名空间 · API 节点路由（CRUD + 归档/反归档）
// ============================================================
import { Router, type Request, type Response } from 'express';
import * as nodeService from '../../services/nodeService.js';
import type { ApiResponse, ApiNode, HttpMethod } from '../../../shared/types.js';

export const apiNodeRouter = Router();

function isHttpMethod(v: unknown): v is HttpMethod {
  return v === 'GET' || v === 'POST' || v === 'PUT' || v === 'DELETE' || v === 'PATCH';
}

// GET /api/nodes
apiNodeRouter.get('/', (req: Request, res: Response) => {
  const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  const nodes = nodeService.listNodes(projectId);
  const body: ApiResponse<ApiNode[]> = { code: 0, message: 'ok', data: nodes };
  res.json(body);
});

// GET /api/nodes/:id
apiNodeRouter.get('/:id', (req: Request, res: Response) => {
  const node = nodeService.getNode(req.params.id as string);
  if (!node) {
    const body: ApiResponse = { code: 404, message: '节点不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse<ApiNode> = { code: 0, message: 'ok', data: node };
  res.json(body);
});

// POST /api/nodes
apiNodeRouter.post('/', (req: Request, res: Response) => {
  const { projectId, name, description, method, path, params, group, remark, slug: bodySlug } = req.body as Record<string, unknown>;

  if (!projectId || typeof projectId !== 'string') {
    const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }
  if (!name || typeof name !== 'string') {
    const body: ApiResponse = { code: 400, message: 'name 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }
  if (!isHttpMethod(method)) {
    const body: ApiResponse = { code: 400, message: 'method 必须是 GET/POST/PUT/DELETE/PATCH', data: null };
    res.status(400).json(body);
    return;
  }
  if (!path || typeof path !== 'string') {
    const body: ApiResponse = { code: 400, message: 'path 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  const result = nodeService.createNode({
    projectId,
    name,
    description: typeof description === 'string' ? description : undefined,
    method,
    path,
    params: Array.isArray(params) ? params : undefined,
    group: typeof group === 'string' ? group : undefined,
    remark: typeof remark === 'string' ? remark : undefined,
    slug: typeof bodySlug === 'string' ? bodySlug : undefined,
  });

  if ('error' in result) {
    const body: ApiResponse = { code: 400, message: result.error, data: null };
    res.status(400).json(body);
    return;
  }

  const body: ApiResponse<ApiNode> = { code: 0, message: 'ok', data: result };
  res.status(201).json(body);
});

// PUT /api/nodes/:id
apiNodeRouter.put('/:id', (req: Request, res: Response) => {
  const existing = nodeService.getNode(req.params.id as string);
  if (!existing) {
    const body: ApiResponse = { code: 404, message: '节点不存在', data: null };
    res.status(404).json(body);
    return;
  }

  const body = req.body as Record<string, unknown>;

  // OpenAPI 源节点保护：校验 method/path/params 是否被尝试修改
  if (existing.source === 'openapi') {
    if (
      (body.method !== undefined) ||
      (body.path !== undefined) ||
      (body.params !== undefined)
    ) {
      const resp: ApiResponse = { code: 403, message: 'OpenAPI 来源的节点不可修改 method/path/params', data: null };
      res.status(403).json(resp);
      return;
    }
  }

  const updated = nodeService.updateNode(req.params.id as string, {
    name: typeof body.name === 'string' ? body.name : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    method: isHttpMethod(body.method) ? body.method : undefined,
    path: typeof body.path === 'string' ? body.path : undefined,
    params: Array.isArray(body.params) ? body.params : undefined,
    group: body.group !== undefined ? (typeof body.group === 'string' ? body.group : undefined) : undefined,
    remark: body.remark !== undefined ? (typeof body.remark === 'string' ? body.remark : undefined) : undefined,
    slug: typeof body.slug === 'string' ? body.slug : body.slug === '' ? '' : undefined,
    mcpToolEnabled: typeof body.mcpToolEnabled === 'boolean' ? body.mcpToolEnabled : undefined,
    boundModelId: body.boundModelId !== undefined ? (typeof body.boundModelId === 'string' ? body.boundModelId : null) : undefined,
  });

  if (!updated) {
    const resp: ApiResponse = { code: 404, message: '节点不存在', data: null };
    res.status(404).json(resp);
    return;
  }

  const resp: ApiResponse<ApiNode> = { code: 0, message: 'ok', data: updated };
  res.json(resp);
});

// DELETE /api/nodes/:id
apiNodeRouter.delete('/:id', (req: Request, res: Response) => {
  const deleted = nodeService.deleteNode(req.params.id as string);
  if (!deleted) {
    const body: ApiResponse = { code: 404, message: '节点不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: null };
  res.json(body);
});

// POST /api/nodes/:id/archive
apiNodeRouter.post('/:id/archive', (req: Request, res: Response) => {
  const archived = nodeService.archiveNode(req.params.id as string);
  if (!archived) {
    const body: ApiResponse = { code: 404, message: '节点不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse<ApiNode> = { code: 0, message: 'ok', data: archived };
  res.json(body);
});

// POST /api/nodes/:id/unarchive
apiNodeRouter.post('/:id/unarchive', (req: Request, res: Response) => {
  const unarchived = nodeService.unarchiveNode(req.params.id as string);
  if (!unarchived) {
    const body: ApiResponse = { code: 404, message: '节点不存在', data: null };
    res.status(404).json(body);
    return;
  }
  const body: ApiResponse<ApiNode> = { code: 0, message: 'ok', data: unarchived };
  res.json(body);
});

// PATCH /api/nodes/:id/slug —— 单独更新节点标识
apiNodeRouter.patch('/:id/slug', (req: Request, res: Response) => {
  const { slug } = req.body as Record<string, unknown>;
  if (!slug || typeof slug !== 'string') {
    const body: ApiResponse = { code: 400, message: 'slug 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  const result = nodeService.updateNodeSlug(req.params.id as string, slug);
  if ('error' in result) {
    const body: ApiResponse = { code: result.code, message: result.error, data: null };
    res.status(result.code).json(body);
    return;
  }
  const body: ApiResponse = { code: 0, message: 'ok', data: result };
  res.json(body);
});

// POST /api/nodes/batch-mcp-register —— 批量注册/取消 MCP Tool
apiNodeRouter.post('/batch-mcp-register', (req: Request, res: Response) => {
  const { nodeIds, enabled } = req.body as Record<string, unknown>;

  if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
    const body: ApiResponse = { code: 400, message: 'nodeIds 必须是非空数组', data: null };
    res.status(400).json(body);
    return;
  }

  const result = nodeService.batchMcpRegister(nodeIds as string[], enabled !== false);
  const body: ApiResponse = { code: 0, message: 'ok', data: result };
  res.json(body);
});
