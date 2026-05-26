import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  readRegistry,
  writeRegistry,
  validateLocaleCode,
  normalizeLocaleCode,
  normalizeTextDir,
  type LanguageMeta,
} from '@/lib/i18n-files';

function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.email || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

type PatchBody = {
  name?: string;
  flag?: string;
  dir?: string;
};

type RouteContext = { params: Promise<{ locale: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { locale: raw } = await context.params;
  const code = normalizeLocaleCode(raw);
  const err = validateLocaleCode(code);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.name === undefined && body.flag === undefined && body.dir === undefined) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  try {
    const registry = readRegistry();
    const idx = registry.findIndex((l) => l.code === code);
    if (idx === -1) {
      return NextResponse.json({ error: 'Locale not in registry.' }, { status: 404 });
    }

    const prev = registry[idx];
    const nextRow: LanguageMeta = { ...prev };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'Display name cannot be empty.' }, { status: 400 });
      nextRow.name = name;
    }
    if (body.flag !== undefined) {
      nextRow.flag = String(body.flag).trim() || '🌐';
    }
    if (body.dir !== undefined) {
      nextRow.dir = normalizeTextDir(body.dir);
    }

    const next = [...registry];
    next[idx] = nextRow;
    writeRegistry(next.sort((a, b) => a.name.localeCompare(b.name)));

    return NextResponse.json({
      ok: true,
      language: { ...nextRow, dir: normalizeTextDir(nextRow.dir) },
    });
  } catch (e) {
    console.error('admin i18n patch language failed', e);
    return NextResponse.json({ error: 'Failed to update language' }, { status: 500 });
  }
}
