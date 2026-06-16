// ============================================================
// 全局设置持久化 · 供应商 + 模型管理
// ============================================================
import { readFile } from 'node:fs/promises';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { join } from 'node:path';
import { hostname } from 'node:os';
import type { AiProvider, AiModel, GlobalSettings } from '../../shared/types.js';

const DATA_DIR = join(process.cwd(), '.data');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

let settings: GlobalSettings = { providers: [], models: [] };

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.GATEWAY_SECRET || hostname();
  return createHash('sha256').update(secret).digest();
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
    } else {
      settings = { providers: [], models: [] };
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

export function updateSettings(patch: Partial<GlobalSettings>): GlobalSettings {
  if (patch.providers !== undefined) {
    settings.providers = patch.providers.map((p) => ({
      ...p,
      apiKey: (() => {
        if (!p.apiKey) return p.apiKey;
        // 占位符（前端脱敏值）→ 保持原加密值不变
        if (p.apiKey.startsWith('sk-****')) {
          return settings.providers.find((sp) => sp.id === p.id)?.apiKey ?? p.apiKey;
        }
        // 已是加密格式 (hex:hex:hex) → 无需二次加密
        if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(p.apiKey)) {
          return p.apiKey;
        }
        // 明文 → 加密存储
        return encrypt(p.apiKey);
      })(),
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
