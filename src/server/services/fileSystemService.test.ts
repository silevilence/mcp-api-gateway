// ============================================================
// 文件系统核心服务 · 单元测试
// ============================================================
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync } from 'node:fs';
import * as fsService from './fileSystemService.js';

describe('文件系统服务', () => {
  let tmpDir: string;

  beforeEach(() => {
    // 创建临时工作区
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'));
    // 创建测试文件结构
    mkdirSync(join(tmpDir, 'src'));
    mkdirSync(join(tmpDir, 'src', 'utils'));
    mkdirSync(join(tmpDir, 'node_modules'));
    writeFileSync(join(tmpDir, 'src', 'index.ts'), 'console.log("hello");\nconst x = 1;\n');
    writeFileSync(join(tmpDir, 'src', 'utils', 'helper.ts'), 'export const add = (a: number, b: number) => a + b;\n');
    writeFileSync(join(tmpDir, 'README.md'), '# Test Project\n\nThis is a test.\n');
    writeFileSync(join(tmpDir, 'package.json'), '{"name": "test"}\n');
  });

  afterEach(() => {
    // 清理临时工作区
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ---- Glob ----
  it('glob 应匹配 ts 文件', async () => {
    const result = await fsService.glob('**/*.ts', tmpDir, tmpDir);
    expect(result.files.length).toBeGreaterThanOrEqual(2);
    expect(result.files.some((f) => f.endsWith('index.ts'))).toBe(true);
    expect(result.files.some((f) => f.endsWith('helper.ts'))).toBe(true);
  });

  it('glob 应过滤 node_modules', async () => {
    const result = await fsService.glob('**/*', tmpDir, tmpDir);
    expect(result.files.some((f) => f.includes('node_modules'))).toBe(false);
  });

  it('glob 应限制结果数量', async () => {
    // 写入超过 100 个文件
    for (let i = 0; i < 120; i++) {
      writeFileSync(join(tmpDir, `file-${i}.txt`), 'test');
    }
    const result = await fsService.glob('**/*.txt', tmpDir, tmpDir);
    expect(result.files.length).toBeLessThanOrEqual(100);
    expect(result.truncated).toBe(true);
  });

  // ---- Ls ----
  it('ls 应返回目录结构', () => {
    const result = fsService.ls(tmpDir, false, tmpDir);
    expect(result.entries.some((e) => e.name === 'src')).toBe(true);
    expect(result.entries.some((e) => e.name === 'README.md')).toBe(true);
  });

  it('ls 应跳过 node_modules', () => {
    const result = fsService.ls(tmpDir, true, tmpDir);
    expect(result.entries.some((e) => e.name === 'node_modules')).toBe(false);
  });

  it('ls 递归应返回深层文件', () => {
    const result = fsService.ls(tmpDir, true, tmpDir);
    expect(result.entries.some((e) => e.name === 'helper.ts')).toBe(true);
    expect(result.entries.some((e) => e.name === 'index.ts')).toBe(true);
  });

  // ---- Grep ----
  it('grep 应匹配文件内容', async () => {
    const result = await fsService.grep('console.log', tmpDir, '**/*.ts', tmpDir);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.matches[0].file).toContain('index.ts');
    expect(result.matches[0].line).toBe(1);
  });

  it('grep 应支持文件类型过滤', async () => {
    const result = await fsService.grep('test', tmpDir, '*.md', tmpDir);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.matches.every((m) => m.file.endsWith('.md'))).toBe(true);
  });

  // ---- Read ----
  it('read 应返回文件内容', async () => {
    const result = await fsService.read(join(tmpDir, 'src', 'index.ts'), undefined, undefined, tmpDir);
    expect(result.lines.length).toBe(3);
    expect(result.lines[0]).toBe('console.log("hello");');
    expect(result.totalLines).toBe(3);
  });

  it('read 应支持 offset 和 limit', async () => {
    const result = await fsService.read(join(tmpDir, 'src', 'index.ts'), 2, 1, tmpDir);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0]).toBe('const x = 1;');
    expect(result.startLine).toBe(2);
  });

  it('read 应拒绝二进制文件', async () => {
    // 写入一个 .png 扩展名文件
    writeFileSync(join(tmpDir, 'test.png'), Buffer.from([137, 80, 78, 71]));
    await expect(
      fsService.read(join(tmpDir, 'test.png'), undefined, undefined, tmpDir),
    ).rejects.toThrow(/二进制文件/);
  });

  it('read 应拒绝不存在文件', async () => {
    await expect(
      fsService.read(join(tmpDir, 'nonexistent.ts'), undefined, undefined, tmpDir),
    ).rejects.toThrow(/文件不存在/);
  });

  // ---- Edit ----
  it('edit 应执行单次内容替换', async () => {
    const result = await fsService.edit(
      join(tmpDir, 'src', 'index.ts'),
      'console.log("hello");',
      'console.log("world");',
      false,
      tmpDir,
    );
    expect(result.success).toBe(true);
    expect(result.replacedCount).toBe(1);

    // 验证文件内容已更新
    const content = await fsService.read(join(tmpDir, 'src', 'index.ts'), undefined, undefined, tmpDir);
    expect(content.lines[0]).toBe('console.log("world");');
  });

  it('edit 应返回失败当未找到匹配', async () => {
    const result = await fsService.edit(
      join(tmpDir, 'src', 'index.ts'),
      'nonexistent text',
      'replacement',
      false,
      tmpDir,
    );
    expect(result.success).toBe(false);
    expect(result.replacedCount).toBe(0);
  });

  // ---- Write ----
  it('write 应创建新文件', async () => {
    const newPath = join(tmpDir, 'new-file.txt');
    const result = await fsService.write(newPath, 'hello world', tmpDir);
    expect(result.success).toBe(true);
    expect(existsSync(newPath)).toBe(true);

    const content = await fsService.read(newPath, undefined, undefined, tmpDir);
    expect(content.lines[0]).toBe('hello world');
  });

  it('write 应自动创建父目录', async () => {
    const deepPath = join(tmpDir, 'a', 'b', 'c', 'deep.txt');
    const result = await fsService.write(deepPath, 'deep content', tmpDir);
    expect(result.success).toBe(true);
    expect(existsSync(deepPath)).toBe(true);
  });

  // ---- Delete ----
  it('delete 应删除文件', async () => {
    const filePath = join(tmpDir, 'to-delete.txt');
    writeFileSync(filePath, 'delete me');
    const result = await fsService.deletePath(filePath, false, tmpDir);
    expect(result.success).toBe(true);
    expect(existsSync(filePath)).toBe(false);
  });

  it('delete 目录时应拒绝无 recursive', async () => {
    const dirPath = join(tmpDir, 'delete-dir');
    mkdirSync(dirPath);
    await expect(
      fsService.deletePath(dirPath, false, tmpDir),
    ).rejects.toThrow(/recursive/);
  });

  // ---- 作用域校验 ----
  it('应拒绝越界路径访问', async () => {
    const outsidePath = join(tmpDir, '..', 'outside.txt');
    await expect(
      fsService.read(outsidePath, undefined, undefined, tmpDir),
    ).rejects.toThrow(/越权访问/);
  });

  it('glob 应过滤越界结果', async () => {
    // 在外部创建文件
    const outsideDir = mkdtempSync(join(tmpdir(), 'outside-'));
    try {
      writeFileSync(join(outsideDir, 'hack.txt'), 'evil');
      // 使用通配符匹配外部路径
      const result = await fsService.glob(
        `${outsideDir}/**/*.txt`,
        tmpDir,
        tmpDir,
      );
      // 越界文件应被过滤
      expect(result.files.some((f) => f.includes('hack'))).toBe(false);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });
});
