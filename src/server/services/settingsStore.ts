// ============================================================
// 全局设置持久化 · 供应商 + 模型管理
// ============================================================
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AiProvider, AiModel, GlobalSettings } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let DATA_DIR = join(__dirname, '..', '..', '..', '.data');
let SETTINGS_FILE = join(DATA_DIR, 'settings.json');
let KEY_FILE = join(DATA_DIR, '.encryption-key');

let settings: GlobalSettings = { providers: [], models: [] };
let _encryptionKey: Buffer | null = null;

/** 设置自定义数据目录（用于测试隔离） */
export function setDataDir(dir: string): void {
  DATA_DIR = dir;
  SETTINGS_FILE = join(DATA_DIR, 'settings.json');
  KEY_FILE = join(DATA_DIR, '.encryption-key');
  _encryptionKey = null; // 密钥文件路径可能已变
}

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  if (_encryptionKey) return _encryptionKey;

  if (process.env.GATEWAY_SECRET) {
    _encryptionKey = createHash('sha256').update(process.env.GATEWAY_SECRET).digest();
    return _encryptionKey;
  }

  // 尝试从持久化密钥文件加载
  if (existsSync(KEY_FILE)) {
    try {
      const keyHex = readFileSync(KEY_FILE, 'utf8').trim();
      if (keyHex.length === 64) {
        _encryptionKey = Buffer.from(keyHex, 'hex');
        console.warn('[settingsStore] ⚠️ 使用持久化随机密钥，建议设置 GATEWAY_SECRET 环境变量');
        return _encryptionKey;
      }
    } catch { /* fall through to regenerate */ }
  }

  // 生成随机密钥并持久化
  const newKey = randomBytes(32);
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(KEY_FILE, newKey.toString('hex'), 'utf8');
    console.warn('[settingsStore] ⚠️ 已生成随机加密密钥，建议设置 GATEWAY_SECRET 环境变量以使用固定密钥');
  } catch (err) {
    console.warn('[settingsStore] ⚠️ 无法持久化密钥文件，使用临时密钥（重启后可能无法解密）:', (err as Error).message);
  }
  _encryptionKey = newKey;
  return _encryptionKey;
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText; // 明文兼容
  }
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function flushToDisk(): void {
  ensureDataDir();
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

export async function initSettings(): Promise<void> {
  await ensureDataDir();
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = await readFile(SETTINGS_FILE, 'utf8');
      const parsed = JSON.parse(raw) as GlobalSettings;
      settings.providers = Array.isArray(parsed.providers) ? parsed.providers : [];
      settings.models = Array.isArray(parsed.models) ? parsed.models : [];
      console.log(`[settingsStore] ✓ 已加载 ${settings.providers.length} 个供应商、${settings.models.length} 个模型`);
    } else {
      settings = { providers: [], models: [] };
      console.log('[settingsStore] ℹ️ settings.json 不存在，使用空配置');
    }
  } catch (err) {
    console.warn('[settingsStore] 加载设置失败，使用空配置:', (err as Error).message);
    settings = { providers: [], models: [] };
  }
}

export function getSettings(): GlobalSettings {
  return {
    providers: settings.providers.map((p) => ({ ...p })),
    models: settings.models.map((m) => ({ ...m })),
  };
}

/** 解析 apiKey：占位符保留原值、已加密透传、明文加密 */
function resolveApiKey(incomingKey: string, providerId: string, existing: AiProvider[]): string {
  if (!incomingKey) return incomingKey;
  // 占位符（前端脱敏值）→ 保持原加密值不变
  if (incomingKey.startsWith('sk-****')) {
    return existing.find((sp) => sp.id === providerId)?.apiKey ?? incomingKey;
  }
  // 已是加密格式 (hex:hex:hex) → 无需二次加密
  if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(incomingKey)) {
    return incomingKey;
  }
  // 明文 → 加密存储
  return encrypt(incomingKey);
}

export function updateSettings(patch: Partial<GlobalSettings>): GlobalSettings {
  if (patch.providers !== undefined) {
    settings.providers = patch.providers.map((p) => ({
      ...p,
      apiKey: resolveApiKey(p.apiKey, p.id, settings.providers),
    }));
  }
  if (patch.models !== undefined) {
    settings.models = patch.models;
  }
    flushToDisk();
  return getSettings();
}

export function getProvider(id: string): AiProvider | undefined {
  return settings.providers.find((p) => p.id === id);
}

export function getModelsByProvider(providerId: string): AiModel[] {
  return settings.models.filter((m) => m.providerId === providerId);
}

export function getDecryptedApiKey(providerId: string): string | undefined {
  const provider = settings.providers.find((p) => p.id === providerId);
  if (!provider || !provider.apiKey) return undefined;
  try {
    return decrypt(provider.apiKey);
  } catch {
    return provider.apiKey;
  }
}

export function maskApiKey(key: string): string {
  if (!key) return 'sk-****';
  const suffix = key.length >= 4 ? key.slice(-4) : key;
  return `sk-****${suffix}`;
}
