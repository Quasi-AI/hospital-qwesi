import type { LandingKbKind } from '@/models/LandingKnowledgeEntry';

export const LANDING_KB_MAX_FETCH_BYTES = 512 * 1024;
export const LANDING_KB_MAX_FILE_BYTES = 400 * 1024;
export const LANDING_KB_MAX_RESOLVED_PER_ENTRY = 14_000;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === 'metadata.google.internal' || h.endsWith('.internal')) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (m) {
    const parts = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    if (parts.some((p) => p > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }

  if (h.includes(':')) return true;

  return false;
}

export async function fetchHttpsUrlAsPlainText(
  urlStr: string
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let url: URL;
  try {
    url = new URL(urlStr.trim());
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }
  if (url.protocol !== 'https:') return { ok: false, error: 'Only https:// links are allowed' };
  if (isBlockedHostname(url.hostname)) return { ok: false, error: 'That host is not allowed for safety reasons' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(urlStr.trim(), {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'HospitalLandingKB/1.0',
        Accept: 'text/html,text/plain,application/json;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `Fetch failed (${res.status})` };

    const buf = await res.arrayBuffer();
    if (buf.byteLength > LANDING_KB_MAX_FETCH_BYTES) {
      return { ok: false, error: `Page too large (max ${LANDING_KB_MAX_FETCH_BYTES / 1024} KB)` };
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    let text = new TextDecoder('utf-8', { fatal: false }).decode(buf);

    if (ct.includes('application/json')) {
      try {
        text = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* keep raw text */
      }
    } else if (ct.includes('text/html') || text.trimStart().startsWith('<')) {
      text = stripHtml(text);
    }

    return { ok: true, text: truncate(text, LANDING_KB_MAX_RESOLVED_PER_ENTRY) };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : 'Fetch failed';
    return { ok: false, error: msg };
  }
}

export function decodeLandingKbFileBase64(raw: string): Buffer {
  let b64 = raw.trim();
  const prefix = /^data:[^;]+;base64,/;
  if (prefix.test(b64)) {
    b64 = b64.replace(/^data:[^;]+;base64,/, '');
  }
  return Buffer.from(b64, 'base64');
}

export function resolveLandingKbFileContent(
  fileName: string,
  mimeType: string,
  base64: string
): { ok: true; text: string } | { ok: false; error: string } {
  let buf: Buffer;
  try {
    buf = decodeLandingKbFileBase64(base64);
  } catch {
    return { ok: false, error: 'Invalid file encoding' };
  }
  if (buf.length > LANDING_KB_MAX_FILE_BYTES) {
    return { ok: false, error: `File too large (max ${LANDING_KB_MAX_FILE_BYTES / 1024} KB)` };
  }

  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  if (mime.includes('json') || name.endsWith('.json')) {
    try {
      const parsed = JSON.parse(buf.toString('utf8'));
      return {
        ok: true,
        text: truncate(JSON.stringify(parsed, null, 2), LANDING_KB_MAX_RESOLVED_PER_ENTRY),
      };
    } catch {
      return { ok: false, error: 'Invalid JSON file' };
    }
  }

  if (
    mime.startsWith('text/') ||
    mime === 'application/xml' ||
    mime === 'application/javascript' ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.txt')
  ) {
    return { ok: true, text: truncate(buf.toString('utf8'), LANDING_KB_MAX_RESOLVED_PER_ENTRY) };
  }

  return {
    ok: true,
    text:
      `[Uploaded file "${fileName || 'upload'}" (${mimeType || 'unknown type'}) — expand text by using .txt, .md, .json, .csv, or paste content as Text.]`,
  };
}

export async function computeLandingKbResolved(entry: {
  kind: LandingKbKind;
  title: string;
  textBody?: string;
  jsonBody?: string;
  linkUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileBase64?: string;
}): Promise<{ ok: true; resolvedText: string } | { ok: false; error: string }> {
  const titleLine = `[Entry: ${entry.title.trim() || 'Untitled'}]\n`;

  switch (entry.kind) {
    case 'text': {
      const body = (entry.textBody || '').trim();
      if (!body) return { ok: false, error: 'Text content is empty' };
      return { ok: true, resolvedText: truncate(titleLine + body, LANDING_KB_MAX_RESOLVED_PER_ENTRY) };
    }
    case 'json': {
      const raw = (entry.jsonBody || '').trim();
      if (!raw) return { ok: false, error: 'JSON content is empty' };
      try {
        const obj = JSON.parse(raw);
        return {
          ok: true,
          resolvedText: truncate(titleLine + JSON.stringify(obj, null, 2), LANDING_KB_MAX_RESOLVED_PER_ENTRY),
        };
      } catch {
        return { ok: false, error: 'Invalid JSON' };
      }
    }
    case 'link': {
      const u = (entry.linkUrl || '').trim();
      if (!u) return { ok: false, error: 'Link URL is empty' };
      const fetched = await fetchHttpsUrlAsPlainText(u);
      if (!fetched.ok) return { ok: false, error: fetched.error };
      return {
        ok: true,
        resolvedText: truncate(`${titleLine}Source: ${u}\n\n${fetched.text}`, LANDING_KB_MAX_RESOLVED_PER_ENTRY),
      };
    }
    case 'file': {
      const b64 = entry.fileBase64 || '';
      if (!b64.trim()) return { ok: false, error: 'No file uploaded' };
      const r = resolveLandingKbFileContent(entry.fileName || 'upload', entry.mimeType || '', b64);
      if (!r.ok) return r;
      return { ok: true, resolvedText: truncate(titleLine + r.text, LANDING_KB_MAX_RESOLVED_PER_ENTRY) };
    }
    default:
      return { ok: false, error: 'Unknown entry kind' };
  }
}
