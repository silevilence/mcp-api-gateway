// ============================================================
// Slug 标识服务 · 生成、校验、唯一性检查
// ============================================================
import * as store from './store.js';

const SLUG_REGEX = /^[a-zA-Z0-9_-]+$/;
const SLUG_MAX_LENGTH = 64;

/**
 * 从名称自动生成 slug。
 * 规则：全小写 → 非 [a-z0-9_-] 字符替换为 - → 连续 - 合并 → 首尾去 - → 截断 64 字符。
 * 若结果为空，返回空字符串（由调用方决定是否回退）。
 */
export function generateSlug(name: string): string {
  if (!name) return '';

  let slug = name
    .toLowerCase()
    .trim()
    // 将常见的非 ASCII 分隔符统一转为连字符
    .replace(/[\s/\\|@#$%^&*()+=<>[\]{};:'",.?！]+/g, '-')
    // 移除非 [a-z0-9_-] 的字符（含中文等非 ASCII 字符）
    .replace(/[^a-z0-9_-]/g, '')
    // 合并连续连字符
    .replace(/-+/g, '-')
    // 移除下划线旁的连字符（如 a-_b → a_b）
    .replace(/-_/g, '_')
    .replace(/_-/g, '_')
    // 首尾去连字符
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  // 截断
  if (slug.length > SLUG_MAX_LENGTH) {
    slug = slug.slice(0, SLUG_MAX_LENGTH).replace(/-+$/, '');
  }

  return slug;
}

/** 校验 slug 格式 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim().length === 0) {
    return { valid: false, error: '标识不能为空' };
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return { valid: false, error: `标识长度不能超过 ${SLUG_MAX_LENGTH} 个字符` };
  }
  if (!SLUG_REGEX.test(slug)) {
    return { valid: false, error: '标识仅允许英文字母、数字、短横线及下划线' };
  }
  return { valid: true };
}

/** 检查项目 slug 全局唯一性 */
export function isProjectSlugUnique(slug: string, excludeProjectId?: string): boolean {
  const projects = store.getAllProjects();
  return !projects.some(
    (p) => p.slug === slug && p.id !== excludeProjectId,
  );
}

/** 检查节点 slug 在项目作用域内唯一性 */
export function isNodeSlugUnique(
  projectId: string,
  slug: string,
  excludeNodeId?: string,
): boolean {
  const nodes = store.getNodesByProjectId(projectId);
  return !nodes.some(
    (n) => n.slug === slug && n.id !== excludeNodeId,
  );
}

/** 将 slug 字段安全合并到对象（若 slug 非空且有效） */
export function applySlug<T extends { slug?: string }>(
  target: T,
  slug: string | undefined,
): T {
  if (slug === undefined) return target;
  const trimmed = slug.trim();
  if (trimmed === '') {
    return { ...target, slug: undefined };
  }
  return { ...target, slug: trimmed };
}
