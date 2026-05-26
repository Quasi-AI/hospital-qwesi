import fs from 'fs';
import path from 'path';

export type TextDir = 'ltr' | 'rtl';

export type LanguageMeta = { code: string; name: string; flag: string; dir?: TextDir };

export function normalizeTextDir(raw: unknown): TextDir {
  if (raw === 'rtl') return 'rtl';
  return 'ltr';
}

const RESERVED_LOCALE_FILES = new Set(['languages']);

export function getMessagesDir(): string {
  return path.join(process.cwd(), 'messages');
}

export function getRegistryPath(): string {
  return path.join(getMessagesDir(), 'languages.json');
}

export function normalizeLocaleCode(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns error message or null if valid. */
export function validateLocaleCode(raw: string): string | null {
  const code = normalizeLocaleCode(raw);
  if (!code) return 'Locale code is required.';
  if (code.length > 20) return 'Locale code is too long.';
  if (!/^[a-z]{2}(-[a-z0-9]+)*$/.test(code)) {
    return 'Use a BCP-47 style code such as "de", "pt", or "zh-cn".';
  }
  if (RESERVED_LOCALE_FILES.has(code)) return 'This code is reserved.';
  return null;
}

export function readRegistry(): LanguageMeta[] {
  const p = getRegistryPath();
  const raw = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) throw new Error('Invalid languages registry');
  return data as LanguageMeta[];
}

export function writeRegistry(items: LanguageMeta[]): void {
  const p = getRegistryPath();
  fs.writeFileSync(p, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

export function messagesFilePath(code: string): string {
  return path.join(getMessagesDir(), `${normalizeLocaleCode(code)}.json`);
}

export function messagesFileExists(code: string): boolean {
  return fs.existsSync(messagesFilePath(code));
}

export function readMessagesJson(code: string): Record<string, unknown> {
  const raw = fs.readFileSync(messagesFilePath(code), 'utf8');
  const data = JSON.parse(raw) as unknown;
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Messages file must be a JSON object');
  }
  return data as Record<string, unknown>;
}

export function writeMessagesJson(code: string, data: unknown): void {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Messages must be a JSON object');
  }
  fs.writeFileSync(messagesFilePath(code), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
