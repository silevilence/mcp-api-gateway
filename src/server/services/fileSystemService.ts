// ============================================================
// 文件系统核心原子能力服务
// 实现 7 个原子能力：glob, ls, grep, read, edit, write, delete
// 所有操作强制工作区根路径作用域校验
// ============================================================
import { readFile, writeFile, mkdir, unlink, rm } from 'node:fs/promises';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, relative, join, dirname, sep } from 'node:path';
import fastGlob from 'fast-glob';
import type {
  FileSystemGlobResult,
  FileSystemLsResult,
  FileSystemLsEntry,
  FileSystemGrepResult,
  FileSystemGrepMatch,
  FileSystemReadResult,
  FileSystemEditResult,
} from '../../shared/types.js';

// ---- 常量 ----
const MAX_GLOB_RESULTS = 100;
const MAX_LS_RESULTS = 100;
const MAX_RECURSIVE_DEPTH = 5;
const MAX_GREP_RESULTS = 100;
const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;

// 黑名单目录（ls/grep 时自动跳过）
const IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.svn', '.hg',
  '.next', '.nuxt', '.cache', 'coverage', '.nyc_output',
]);

// ---- 作用域校验 ----

export class FileSystemError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'FileSystemError';
    this.code = code;
  }
}

function assertInScope(absolutePath: string, workspaceRoot: string): void {
  const resolved = resolve(absolutePath);
  const root = resolve(workspaceRoot);

  // 确保 resolved 路径以 root 开头
  const relativePath = relative(root, resolved);
  if (relativePath.startsWith('..') || (relativePath && sep !== '/' && relativePath.startsWith('..'))) {
    throw new FileSystemError(
      `路径越权访问：${resolved} 不在工作区目录 ${root} 范围内`,
      403,
    );
  }
}

/** 检查路径是否在作用域内（返回规范化路径或抛出错误） */
function resolveScopedPath(inputPath: string | undefined, workspaceRoot: string): string {
  const root = resolve(workspaceRoot);
  if (!inputPath) return root;
  const resolved = resolve(inputPath);
  assertInScope(resolved, workspaceRoot);
  return resolved;
}

function isIgnoredDir(name: string): boolean {
  // 跳过隐藏目录（以 . 开头），但保留 .env.example
  if (name.startsWith('.') && name !== '.env.example') return true;
  return IGNORED_DIRS.has(name);
}

function isBinaryFile(filePath: string): boolean {
  // 通过文件扩展名快速判断
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext) return false;

  const binaryExts = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp',
    'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv',
    'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'exe', 'dll', 'so', 'dylib', 'bin', 'wasm',
    'ttf', 'otf', 'woff', 'woff2',
    'pyc', 'pyo', 'pyd',
    'o', 'a', 'lib', 'obj',
  ]);
  return binaryExts.has(ext);
}

// ---- 1. Glob 高性能模式匹配 ----

export async function glob(
  pattern: string,
  path?: string,
  workspaceRoot: string = process.cwd(),
): Promise<FileSystemGlobResult> {
  const root = resolveScopedPath(path, workspaceRoot);

  // 使用 fast-glob 进行高性能匹配
  const results = await fastGlob(pattern, {
    cwd: root,
    absolute: true,
    onlyFiles: false,
    followSymbolicLinks: false,
    markDirectories: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/build/**',
    ],
  });

  // 按修改时间倒序排列
  const withStats = results
    .map((f) => {
      try {
        const stats = statSync(f);
        return { file: f, mtime: stats.mtimeMs };
      } catch {
        return { file: f, mtime: 0 };
      }
    })
    .sort((a, b) => b.mtime - a.mtime);

  const files = withStats.map((f) => f.file);

  // 作用域校验（即使 fast-glob 返回了越界路径）
  const scopedFiles: string[] = [];
  for (const file of files) {
    try {
      assertInScope(file, workspaceRoot);
      scopedFiles.push(file);
    } catch {
      // 跳过越界文件
    }
  }

  const truncated = scopedFiles.length > MAX_GLOB_RESULTS;
  return {
    files: scopedFiles.slice(0, MAX_GLOB_RESULTS),
    totalCount: scopedFiles.length,
    truncated,
  };
}

// ---- 2. Ls 目录结构拓扑检索 ----

export function ls(
  path?: string,
  recursive: boolean = false,
  workspaceRoot: string = process.cwd(),
): FileSystemLsResult {
  const root = resolveScopedPath(path, workspaceRoot);
  const entries: FileSystemLsEntry[] = [];

  function walk(dirPath: string, depth: number = 0): void {
    if (depth > MAX_RECURSIVE_DEPTH) return;
    if (entries.length >= MAX_LS_RESULTS) return;

    let dirEntries: string[];
    try {
      dirEntries = readdirSync(dirPath);
    } catch {
      return;
    }

    for (const name of dirEntries) {
      if (entries.length >= MAX_LS_RESULTS) break;
      if (isIgnoredDir(name)) continue;

      const fullPath = join(dirPath, name);

      // 作用域校验
      try {
        assertInScope(fullPath, workspaceRoot);
      } catch {
        continue;
      }

      let type: 'file' | 'dir' | 'symlink' = 'file';
      let size: number | undefined;
      let modifiedAt: string | undefined;

      try {
        const stats = statSync(fullPath);
        if (stats.isDirectory()) type = 'dir';
        else if (stats.isSymbolicLink()) type = 'symlink';
        size = stats.size;
        modifiedAt = stats.mtime.toISOString();
      } catch {
        type = 'file';
      }

      entries.push({ name, path: fullPath, type, size, modifiedAt });

      if (recursive && type === 'dir') {
        walk(fullPath, depth + 1);
      }
    }
  }

  walk(root);

  const truncated = entries.length >= MAX_LS_RESULTS;
  return { entries, totalCount: entries.length, truncated };
}

// ---- 3. Grep 正则内容检索 ----

export async function grep(
  pattern: string,
  path?: string,
  include?: string,
  workspaceRoot: string = process.cwd(),
): Promise<FileSystemGrepResult> {
  const root = resolveScopedPath(path, workspaceRoot);
  const regex = new RegExp(pattern);
  const matches: FileSystemGrepMatch[] = [];
  const includeGlob = include || '**/*';

  // 使用 fast-glob 查找匹配文件
  const files = await fastGlob(includeGlob, {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/build/**',
    ],
  });

  // 作用域过滤
  const scopedFiles = files.filter((f) => {
    try {
      assertInScope(f, workspaceRoot);
      return true;
    } catch {
      return false;
    }
  });

  for (const file of scopedFiles) {
    if (matches.length >= MAX_GREP_RESULTS) break;
    if (isBinaryFile(file)) continue;

    try {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= MAX_GREP_RESULTS) break;
        if (regex.test(lines[i])) {
          matches.push({
            file,
            line: i + 1,
            content: lines[i].substring(0, MAX_LINE_LENGTH),
          });
        }
      }
    } catch {
      // 跳过无法读取的文件
      continue;
    }
  }

  const truncated = matches.length >= MAX_GREP_RESULTS;
  return { matches, totalCount: matches.length, truncated };
}

// ---- 4. Read 安全文件读取 ----

export async function read(
  filePath: string,
  offset?: number,
  limit?: number,
  workspaceRoot: string = process.cwd(),
): Promise<FileSystemReadResult> {
  const resolved = resolveScopedPath(filePath, workspaceRoot);

  if (isBinaryFile(resolved)) {
    throw new FileSystemError('二进制文件无法以文本方式读取', 400);
  }

  if (!existsSync(resolved)) {
    throw new FileSystemError(`文件不存在: ${resolved}`, 404);
  }

  const stat = statSync(resolved);
  if (stat.isDirectory()) {
    throw new FileSystemError('指定路径为目录，请使用 ls 接口查看', 400);
  }

  const content = await readFile(resolved, 'utf-8');
  const allLines = content.split('\n');
  const totalLines = allLines.length;

  const startLine = offset ?? 1;
  const readLimit = limit ?? DEFAULT_READ_LIMIT;

  if (startLine < 1) {
    throw new FileSystemError('起始行号必须 >= 1', 400);
  }

  const fromIdx = startLine - 1;
  const toIdx = Math.min(fromIdx + readLimit, totalLines);

  const lines = allLines.slice(fromIdx, toIdx).map((line, idx) =>
    line.length > MAX_LINE_LENGTH
      ? line.substring(0, MAX_LINE_LENGTH) + `\n<!-- 行 ${startLine + idx} 被截断，超出 ${MAX_LINE_LENGTH} 字符 -->`
      : line,
  );

  const truncated = toIdx < totalLines;

  return { lines, totalLines, startLine, truncated };
}

// ---- 5. Edit 原子级内容替换 ----

export async function edit(
  filePath: string,
  oldString: string,
  newString: string,
  replaceAll: boolean = false,
  workspaceRoot: string = process.cwd(),
): Promise<FileSystemEditResult> {
  const resolved = resolveScopedPath(filePath, workspaceRoot);

  if (isBinaryFile(resolved)) {
    throw new FileSystemError('二进制文件不支持内容替换', 400);
  }

  if (!existsSync(resolved)) {
    throw new FileSystemError(`文件不存在: ${resolved}`, 404);
  }

  const content = await readFile(resolved, 'utf-8');

  if (replaceAll) {
    // 全局替换
    if (!content.includes(oldString)) {
      return { success: false, replacedCount: 0, message: '未找到匹配文本' };
    }

    // 计算替换次数
    const occurrences = content.split(oldString).length - 1;
    if (oldString === newString) {
      return { success: false, replacedCount: 0, message: '新内容与旧内容一致，无变更' };
    }

    const newContent = content.split(oldString).join(newString);
    await writeFile(resolved, newContent, 'utf-8');
    return { success: true, replacedCount: occurrences };
  } else {
    // 单次替换（只替换第一次出现）
    const idx = content.indexOf(oldString);
    if (idx === -1) {
      return { success: false, replacedCount: 0, message: '未找到匹配文本' };
    }

    const nextIdx = content.indexOf(oldString, idx + 1);
    if (nextIdx !== -1) {
      return { success: false, replacedCount: 0, message: '找到多处匹配，请启用 replace_all 或精确匹配文本' };
    }

    if (oldString === newString) {
      return { success: false, replacedCount: 0, message: '新内容与旧内容一致，无变更' };
    }

    const newContent = content.substring(0, idx) + newString + content.substring(idx + oldString.length);
    await writeFile(resolved, newContent, 'utf-8');
    return { success: true, replacedCount: 1 };
  }
}

// ---- 6. Write 全量内容覆盖 ----

export async function write(
  filePath: string,
  content: string,
  workspaceRoot: string = process.cwd(),
): Promise<{ success: boolean }> {
  const resolved = resolveScopedPath(filePath, workspaceRoot);

  // 自动创建父级目录
  await mkdir(dirname(resolved), { recursive: true });

  await writeFile(resolved, content, 'utf-8');
  return { success: true };
}

// ---- 7. Delete 级联资源销毁 ----

export async function deletePath(
  path: string,
  recursive: boolean = false,
  workspaceRoot: string = process.cwd(),
): Promise<{ success: boolean }> {
  const resolved = resolveScopedPath(path, workspaceRoot);

  if (!existsSync(resolved)) {
    throw new FileSystemError(`路径不存在: ${resolved}`, 404);
  }

  const stat = statSync(resolved);

  if (stat.isDirectory()) {
    if (!recursive) {
      throw new FileSystemError('目录删除需显式开启 recursive 参数', 400);
    }
    await rm(resolved, { recursive: true, force: true });
  } else {
    await unlink(resolved);
  }

  return { success: true };
}
