import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  normalizeLocaleCode,
  validateLocaleCode,
  readMessagesJson,
  writeMessagesJson,
  messagesFileExists,
} from '@/lib/i18n-files';

function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.email || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

type RouteContext = { params: Promise<{ locale: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { locale: raw } = await context.params;
  const code = normalizeLocaleCode(raw);
  const err = validateLocaleCode(code);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  if (!messagesFileExists(code)) {
    return NextResponse.json({ error: 'Locale not found' }, { status: 404 });
  }

  try {
    const messages = readMessagesJson(code);
    return NextResponse.json(messages);
  } catch (e) {
    console.error('admin i18n get messages failed', e);
    return NextResponse.json({ error: 'Failed to read messages' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { locale: raw } = await context.params;
  const code = normalizeLocaleCode(raw);
  const err = validateLocaleCode(code);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  if (!messagesFileExists(code)) {
    return NextResponse.json({ error: 'Locale not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    writeMessagesJson(code, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to save';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
