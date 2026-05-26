// ============================================================
// 数据持久层 · JSON 文件存储
// ============================================================
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApiProject, ApiNode } from '../../shared/types.js';

// ---- 路径解析 ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', '..', '..', '.data');

const PROJECTS_FILE = join(DATA_DIR, 'projects.json');
const NODES_FILE = join(DATA_DIR, 'nodes.json');

// ---- 状态 ----
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DEBOUNCE_MS = 500;
let diskWriteEnabled = true;

// ---- 外部依赖注入 ----
type DataReader = () => { projects: ApiProject[]; nodes: ApiNode[] };
type DataWriter = (projects: ApiProject[], nodes: ApiNode[]) => void;

let readFromMemory: DataReader | null = null;
let writeToMemory: DataWriter | null = null;

export function bindStoreReaders(
  reader: DataReader,
  writer: DataWriter,
): void {
  readFromMemory = reader;
  writeToMemory = writer;
}

// ---- 初始化：从磁盘加载数据 ----
export async function initStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  const results = await Promise.allSettled([
    loadFile<ApiProject[]>(PROJECTS_FILE),
    loadFile<ApiNode[]>(NODES_FILE),
  ]);

  const projects: ApiProject[] =
    results[0].status === 'fulfilled' ? results[0].value : [];
  const nodes: ApiNode[] =
    results[1].status === 'fulfilled' ? results[1].value : [];

  if (results[0].status === 'rejected') {
    console.warn('[persistence] ⚠️ projects.json 读取失败，使用空数据集', results[0].reason);
  }
  if (results[1].status === 'rejected') {
    console.warn('[persistence] ⚠️ nodes.json 读取失败，使用空数据集', results[1].reason);
  }

  // 验证写权限
  try {
    await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), { flag: 'w' });
  } catch {
    console.warn('[persistence] ⚠️ .data 目录无写权限，降级为纯内存模式');
    diskWriteEnabled = false;
  }

  if (writeToMemory) {
    writeToMemory(projects, nodes);
  }

  console.log(
    `[persistence] ✓ 已加载 ${projects.length} 个项目、${nodes.length} 个节点` +
    (diskWriteEnabled ? '' : ' (内存模式)'),
  );
}

// ---- 读取 JSON 文件 ----
async function loadFile<T>(filePath: string): Promise<T> {
  if (!existsSync(filePath)) {
    return [] as unknown as T;
  }
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

// ---- 刷盘 ----
export function scheduleFlush(): void {
  if (!diskWriteEnabled) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushNow().catch((err) => {
      console.error('[persistence] 刷盘失败:', err);
    });
  }, FLUSH_DEBOUNCE_MS);
}

export async function flushNow(): Promise<void> {
  if (!diskWriteEnabled || !readFromMemory) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const { projects, nodes } = readFromMemory();

  await Promise.all([
    writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2)),
    writeFile(NODES_FILE, JSON.stringify(nodes, null, 2)),
  ]);
}

// ---- 工具 ----
export function getDataDir(): string {
  return DATA_DIR;
}
