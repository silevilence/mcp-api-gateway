// ============================================================
// OpenAPI 解析引擎 · 策略/适配器模式
// ============================================================
import type { ApiNode, ApiParam, HttpMethod, SyncDiffResult } from '../../shared/types.js';

// ---- 解析策略接口 ----
interface ParseStrategy {
  parse(source: string): ParsedEndpoint[] | Promise<ParsedEndpoint[]>;
}

interface ParsedEndpoint {
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  parameters: ParsedParam[];
}

interface ParsedParam {
  name: string;
  in: 'query' | 'path' | 'body' | 'formData';
  required: boolean;
  type: string;
  description?: string;
}

// ---- 类型映射 ----
function mapOpenApiType(openApiType: string): ApiParam['type'] {
  switch (openApiType) {
    case 'integer':
    case 'int32':
    case 'int64':
      return 'integer';
    case 'number':
    case 'float':
    case 'double':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    case 'string':
    default:
      return 'string';
  }
}

function mapParamLocation(loc: string): ApiParam['location'] {
  switch (loc) {
    case 'query': return 'query';
    case 'path': return 'path';
    case 'body': return 'body';
    case 'formData': return 'formData';
    default: return 'query';
  }
}

// ---- URL 远程解析策略 ----
class RemoteUrlStrategy implements ParseStrategy {
  async parse(url: string): Promise<ParsedEndpoint[]> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`获取 OpenAPI 文档失败: HTTP ${response.status}`);
    }
    const doc = await response.json() as Record<string, unknown>;
    return extractEndpoints(doc);
  }
}

// ---- 本地 JSON 解析策略 ----
class LocalJsonStrategy implements ParseStrategy {
  parse(jsonText: string): ParsedEndpoint[] {
    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      throw new Error('JSON 解析失败，请检查格式是否正确');
    }
    return extractEndpoints(doc);
  }
}

// ---- 端点提取器 ----
function extractEndpoints(doc: Record<string, unknown>): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];
  const paths = doc.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return endpoints;

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method.toLowerCase()] as Record<string, unknown> | undefined;
      if (!operation) continue;

      const params: ParsedParam[] = [];

      // 提取路径参数
      const pathParams = extractParams(pathItem, 'path');
      params.push(...pathParams);

      // 提取操作级参数
      const opParams = extractParams(operation, 'query');
      params.push(...opParams);

      // 检查 requestBody
      const requestBody = operation.requestBody as Record<string, unknown> | undefined;
      if (requestBody) {
        const content = requestBody.content as Record<string, Record<string, unknown>> | undefined;
        if (content) {
          const jsonContent = content['application/json'];
          if (jsonContent?.schema) {
            const schema = jsonContent.schema as Record<string, unknown>;
            const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
            const requiredList = (schema.required as string[]) ?? [];
            if (props) {
              for (const [propName, propSchema] of Object.entries(props)) {
                params.push({
                  name: propName,
                  in: 'body',
                  required: requiredList.includes(propName),
                  type: (propSchema.type as string) ?? 'string',
                  description: (propSchema.description as string),
                });
              }
            }
          }
        }
      }

      endpoints.push({
        method,
        path: routePath,
        summary: (operation.summary as string) ?? (operation.operationId as string) ?? `${method} ${routePath}`,
        description: (operation.description as string) ?? '',
        parameters: params,
      });
    }
  }

  return endpoints;
}

function extractParams(source: Record<string, unknown>, location: string): ParsedParam[] {
  const parameters = source.parameters as Array<Record<string, unknown>> | undefined;
  if (!parameters) return [];

  return parameters
    .filter((p) => (p.in as string) === location)
    .map((p) => ({
      name: (p.name as string) ?? '',
      in: location as ParsedParam['in'],
      required: (p.required as boolean) ?? false,
      type: (p.schema as Record<string, unknown>)?.type as string ?? (p.type as string) ?? 'string',
      description: (p.description as string),
    }));
}

// ---- 策略上下文 ----
const remoteStrategy = new RemoteUrlStrategy();
const localStrategy = new LocalJsonStrategy();

/**
 * 从远程 URL 解析 OpenAPI 文档
 */
export async function parseFromUrl(url: string): Promise<ParsedEndpoint[]> {
  return remoteStrategy.parse(url);
}

/**
 * 从本地 JSON 文本解析 OpenAPI 文档
 */
export function parseFromJson(jsonText: string): ParsedEndpoint[] {
  return localStrategy.parse(jsonText);
}

/**
 * 将 ParsedEndpoint 转为 ApiNode
 */
export function toApiNodes(
  endpoints: ParsedEndpoint[],
  projectId: string,
): ApiNode[] {
  const now = new Date().toISOString();
  return endpoints.map((ep) => {
    const id = crypto.randomUUID();
    return {
      id,
      projectId,
      name: ep.summary ?? `${ep.method} ${ep.path}`,
      description: ep.description ?? '',
      method: ep.method,
      path: ep.path,
      params: ep.parameters.map(
        (p): ApiParam => ({
          key: p.name,
          type: mapOpenApiType(p.type),
          required: p.required,
          description: p.description,
          location: mapParamLocation(p.in),
        }),
      ),
      hidden: false,
      source: 'openapi' as const,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * 智能 Diff 比对：对比已有节点与新解析节点，返回变更结果
 */
export function computeDiff(
  existingNodes: ApiNode[],
  newEndpoints: ParsedEndpoint[],
): SyncDiffResult {
  const result: SyncDiffResult = { added: [], removed: [], modified: [] };

  const newNodes = toApiNodes(newEndpoints, existingNodes[0]?.projectId ?? '');

  // 构建签名 Map (method + path 作为唯一标识)
  const signature = (n: ApiNode) => `${n.method}:${n.path}`;

  const existingBySig = new Map<string, ApiNode>();
  for (const node of existingNodes) {
    existingBySig.set(signature(node), node);
  }

  const newBySig = new Map<string, ApiNode>();
  for (const node of newNodes) {
    newBySig.set(signature(node), node);
  }

  // 新增：新签名中不在旧签名里的
  for (const [sig, node] of newBySig) {
    if (!existingBySig.has(sig)) {
      result.added.push(node);
    }
  }

  // 删除：旧签名中不在新签名里的
  for (const [sig, node] of existingBySig) {
    if (!newBySig.has(sig)) {
      result.removed.push(node);
    }
  }

  // 修改：两边都有但内容不同
  for (const [sig, newNode] of newBySig) {
    const oldNode = existingBySig.get(sig);
    if (!oldNode) continue;

    const changes: string[] = [];
    if (oldNode.name !== newNode.name) changes.push('name');
    if (oldNode.description !== newNode.description) changes.push('description');
    if (oldNode.path !== newNode.path) changes.push('path');
    if (JSON.stringify(oldNode.params) !== JSON.stringify(newNode.params)) changes.push('params');

    if (changes.length > 0) {
      result.modified.push({
        before: oldNode,
        after: newNode,
        changes,
      });
    }
  }

  return result;
}
