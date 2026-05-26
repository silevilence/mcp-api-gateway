// ============================================================
// OpenAPI 解析与管理路由
// ============================================================
import { Router, type Request, type Response } from 'express';
import { parseFromUrl, parseFromJson, computeDiff, toApiNodes } from '../services/openapiParser.js';
import { getProject, updateProject } from '../services/projectService.js';
import { getNodesByProjectId } from '../services/store.js';
import { batchUpsertNodes, deleteNode } from '../services/nodeService.js';
import { createAuditLog } from '../services/auditService.js';
import type { ApiResponse, SyncDiffResult } from '../../shared/types.js';

export const openapiRouter = Router();

// POST /internal/openapi/parse-url —— 从远程 URL 解析
openapiRouter.post('/parse-url', async (req: Request, res: Response) => {
  const { url } = req.body as Record<string, unknown>;

  if (!url || typeof url !== 'string') {
    const body: ApiResponse = { code: 400, message: 'url 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  try {
    const endpoints = await parseFromUrl(url);
    const body: ApiResponse = { code: 0, message: 'ok', data: { url, endpointCount: endpoints.length, endpoints } };
    res.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : '解析失败';
    const body: ApiResponse = { code: 500, message, data: null };
    res.status(500).json(body);
  }
});

// POST /internal/openapi/parse-json —— 从本地 JSON 解析
openapiRouter.post('/parse-json', (req: Request, res: Response) => {
  const { jsonText, projectId } = req.body as Record<string, unknown>;

  if (!jsonText || typeof jsonText !== 'string') {
    const body: ApiResponse = { code: 400, message: 'jsonText 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  try {
    const endpoints = parseFromJson(jsonText);

    // 如果提供了 projectId，则将端点保存为节点
    if (projectId && typeof projectId === 'string') {
      const project = getProject(projectId);
      if (!project) {
        const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
        res.status(404).json(body);
        return;
      }
      const nodes = toApiNodes(endpoints, projectId);
      batchUpsertNodes(nodes);
      updateProject(projectId, { localJsonPath: '(内联 JSON)' });
      createAuditLog('sync', 'project', projectId, `从 JSON 导入 ${nodes.length} 个 API 节点`);
    }

    const body: ApiResponse = { code: 0, message: 'ok', data: { endpointCount: endpoints.length, endpoints } };
    res.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : '解析失败';
    const body: ApiResponse = { code: 400, message, data: null };
    res.status(400).json(body);
  }
});

// POST /internal/openapi/sync-diff —— 智能 Diff 比对
openapiRouter.post('/sync-diff', async (req: Request, res: Response) => {
  const { projectId, url, jsonText } = req.body as Record<string, unknown>;

  if (!projectId || typeof projectId !== 'string') {
    const body: ApiResponse = { code: 400, message: 'projectId 为必填字段', data: null };
    res.status(400).json(body);
    return;
  }

  const project = getProject(projectId);
  if (!project) {
    const body: ApiResponse = { code: 404, message: '项目不存在', data: null };
    res.status(404).json(body);
    return;
  }

  try {
    const endpoints = url && typeof url === 'string'
      ? await parseFromUrl(url)
      : parseFromJson(typeof jsonText === 'string' ? jsonText : '{}');

    const existingNodes = getNodesByProjectId(projectId);
    const diff = computeDiff(existingNodes, endpoints);

    // 应用 Diff 变更
    let appliedMsg = '';
    if (diff.added.length > 0) {
      batchUpsertNodes(diff.added);
      appliedMsg += `新增 ${diff.added.length} 个节点；`;
    }
    if (diff.removed.length > 0) {
      for (const node of diff.removed) {
        deleteNode(node.id);
      }
      appliedMsg += `移除 ${diff.removed.length} 个节点；`;
    }
    if (diff.modified.length > 0) {
      for (const { after } of diff.modified) {
        batchUpsertNodes([after]);
      }
      appliedMsg += `更新 ${diff.modified.length} 个节点；`;
    }

    if (appliedMsg) {
      createAuditLog('sync', 'project', projectId, `Diff 同步: ${appliedMsg}`);
    }

    const body: ApiResponse<SyncDiffResult> = { code: 0, message: 'ok', data: diff };
    res.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Diff 比对失败';
    const body: ApiResponse = { code: 500, message, data: null };
    res.status(500).json(body);
  }
});
