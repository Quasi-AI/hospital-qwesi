import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  readRegistry,
  writeRegistry,
  validateLocaleCode,
  normalizeLocaleCode,
  messagesFileExists,
  readMessagesJson,
  writeMessagesJson,
  deepClone,
  normalizeTextDir,
  type LanguageMeta,
} from '@/lib/i18n-files';

function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.email || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  try {
    const registry = readRegistry();
    const withFiles = registry.map((row) => ({
      ...row,
      dir: normalizeTextDir(row.dir),
      fileExists: messagesFileExists(row.code),
    }));
    return NextResponse.json({ languages: withFiles });
  } catch (e) {
    console.error('admin i18n languages list failed', e);
    return NextResponse.json({ error: 'Failed to list languages' }, { status: 500 });
  }
}

type CreateBody = {
  code?: string;
  name?: string;
  flag?: string;
  dir?: string;
  copyFrom?: string;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const codeErr = validateLocaleCode(body.code || '');
  if (codeErr) return NextResponse.json({ error: codeErr }, { status: 400 });

  const code = normalizeLocaleCode(body.code!);
  const name = (body.name || '').trim();
  const flag = (body.flag || '🌐').trim();
  const dir = normalizeTextDir(body.dir);
  if (!name) return NextResponse.json({ error: 'Display name is required.' }, { status: 400 });

  const copyFrom = normalizeLocaleCode(body.copyFrom || 'en');
  if (!messagesFileExists(copyFrom)) {
    return NextResponse.json(
      { error: `Reference language file missing: ${copyFrom}.json` },
      { status: 400 }
    );
  }

  if (messagesFileExists(code)) {
    return NextResponse.json({ error: 'A messages file for this code already exists.' }, { status: 409 });
  }

  try {
    const registry = readRegistry();
    if (registry.some((l) => l.code === code)) {
      return NextResponse.json({ error: 'This locale is already registered.' }, { status: 409 });
    }

    const template = readMessagesJson(copyFrom);
    const clone = deepClone(template);
    writeMessagesJson(code, clone);

    const next: LanguageMeta[] = [...registry, { code, name, flag, dir }].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    writeRegistry(next);

    return NextResponse.json({ ok: true, language: { code, name, flag, dir } });
  } catch (e) {
    console.error('admin i18n create language failed', e);
    return NextResponse.json({ error: 'Failed to create language' }, { status: 500 });
  }
}
