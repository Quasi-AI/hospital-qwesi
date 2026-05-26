import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import LandingKnowledgeEntry from '@/models/LandingKnowledgeEntry';
import type { LandingKbKind } from '@/models/LandingKnowledgeEntry';
import { computeLandingKbResolved } from '@/lib/landingKnowledgeResolve';

function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.email || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

const KINDS: LandingKbKind[] = ['text', 'json', 'link', 'file'];

function parseKind(v: unknown): LandingKbKind | null {
  if (typeof v !== 'string') return null;
  return KINDS.includes(v as LandingKbKind) ? (v as LandingKbKind) : null;
}

/** GET full entry (includes file payload for editors) */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  try {
    const { id } = await params;
    await dbConnect();
    const doc = await LandingKnowledgeEntry.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const entry = {
      ...doc,
      _id: String(doc._id),
    };
    delete (entry as { __v?: unknown }).__v;

    return NextResponse.json({ entry });
  } catch (e) {
    console.error('GET /api/admin/landing-knowledge/[id]', e);
    return NextResponse.json({ error: 'Failed to load entry' }, { status: 500 });
  }
}

/** PATCH partial — toggle enabled without recomputing */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled boolean required' }, { status: 400 });
    }

    await dbConnect();
    const doc = await LandingKnowledgeEntry.findByIdAndUpdate(
      id,
      { $set: { enabled: body.enabled } },
      { returnDocument: 'after' }
    ).lean();

    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const safe = { ...doc, _id: String(doc._id) } as Record<string, unknown>;
    delete safe.fileBase64;
    return NextResponse.json({ ok: true, entry: safe });
  } catch (e) {
    console.error('PATCH /api/admin/landing-knowledge/[id]', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

/** PUT replace / recompute resolved text */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    await dbConnect();
    const existing = await LandingKnowledgeEntry.findById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const title = typeof body.title === 'string' ? body.title.trim() : existing.title;
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const kind = parseKind(body.kind) ?? existing.kind;

    let textBody = typeof body.textBody === 'string' ? body.textBody : existing.textBody;
    let jsonBody = typeof body.jsonBody === 'string' ? body.jsonBody : existing.jsonBody;
    let linkUrl = typeof body.linkUrl === 'string' ? body.linkUrl.trim() : existing.linkUrl;
    let fileName = typeof body.fileName === 'string' ? body.fileName.trim() : existing.fileName;
    let mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : existing.mimeType;
    let fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : existing.fileBase64;

    const keepExistingFile = body.keepExistingFile === true;
    if (kind === 'file' && keepExistingFile && (!body.fileBase64 || body.fileBase64 === '')) {
      fileBase64 = existing.fileBase64;
      fileName = existing.fileName || fileName;
      mimeType = existing.mimeType || mimeType;
    }

    const enabled = typeof body.enabled === 'boolean' ? body.enabled : existing.enabled;

    const sortOrder =
      typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)
        ? body.sortOrder
        : existing.sortOrder;

    const refreshLink = body.refreshLink === true;

    let computed = await computeLandingKbResolved({
      kind,
      title,
      textBody,
      jsonBody,
      linkUrl,
      fileName,
      mimeType,
      fileBase64,
    });

    if (
      !computed.ok &&
      kind === 'link' &&
      !refreshLink &&
      existing.kind === 'link' &&
      existing.resolvedText?.trim()
    ) {
      computed = { ok: true, resolvedText: existing.resolvedText };
    }

    if (!computed.ok) return NextResponse.json({ error: computed.error }, { status: 400 });

    existing.title = title;
    existing.enabled = enabled;
    existing.kind = kind;
    existing.textBody = kind === 'text' ? textBody : '';
    existing.jsonBody = kind === 'json' ? jsonBody : '';
    existing.linkUrl = kind === 'link' ? linkUrl : '';
    existing.fileName = kind === 'file' ? fileName : '';
    existing.mimeType = kind === 'file' ? mimeType : '';
    existing.fileBase64 = kind === 'file' ? fileBase64 : '';
    existing.resolvedText = computed.resolvedText;
    existing.sortOrder = sortOrder;

    await existing.save();

    const lean = existing.toObject();
    delete lean.fileBase64;

    return NextResponse.json({ entry: { ...lean, _id: String(existing._id) } });
  } catch (e) {
    console.error('PUT /api/admin/landing-knowledge/[id]', e);
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  try {
    const { id } = await params;
    await dbConnect();
    const res = await LandingKnowledgeEntry.findByIdAndDelete(id);
    if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/landing-knowledge/[id]', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
