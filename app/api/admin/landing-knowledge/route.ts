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

/** GET list — omits large file payloads */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  try {
    await dbConnect();
    const rows = await LandingKnowledgeEntry.find()
      .sort({ sortOrder: 1, createdAt: 1 })
      .select('-fileBase64')
      .lean();

    const entries = rows.map((r) => {
      const resolved = (r.resolvedText || '').trim();
      return {
        _id: String(r._id),
        title: r.title,
        enabled: r.enabled,
        kind: r.kind,
        sortOrder: r.sortOrder,
        hasFile: r.kind === 'file',
        resolvedPreview:
          resolved.length > 280 ? `${resolved.slice(0, 280)}…` : resolved,
        updatedAt: r.updatedAt,
      };
    });

    return NextResponse.json({ entries });
  } catch (e) {
    console.error('GET /api/admin/landing-knowledge', e);
    return NextResponse.json({ error: 'Failed to load knowledge base' }, { status: 500 });
  }
}

/** POST create */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdmin(session);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const kind = parseKind(body.kind);
    if (!kind) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });

    const textBody = typeof body.textBody === 'string' ? body.textBody : '';
    const jsonBody = typeof body.jsonBody === 'string' ? body.jsonBody : '';
    const linkUrl = typeof body.linkUrl === 'string' ? body.linkUrl.trim() : '';
    const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
    const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : '';
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : true;

    await dbConnect();

    let sortOrder = typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder) ? body.sortOrder : NaN;
    if (!Number.isFinite(sortOrder)) {
      const max = await LandingKnowledgeEntry.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
      sortOrder = (max?.sortOrder ?? 0) + 1;
    }

    const computed = await computeLandingKbResolved({
      kind,
      title,
      textBody,
      jsonBody,
      linkUrl,
      fileName,
      mimeType,
      fileBase64,
    });

    if (!computed.ok) return NextResponse.json({ error: computed.error }, { status: 400 });

    const doc = await LandingKnowledgeEntry.create({
      title,
      enabled,
      kind,
      textBody,
      jsonBody,
      linkUrl,
      fileName,
      mimeType,
      fileBase64: kind === 'file' ? fileBase64 : '',
      resolvedText: computed.resolvedText,
      sortOrder,
    });

    const lean = doc.toObject();
    delete lean.fileBase64;

    return NextResponse.json({ entry: { ...lean, _id: String(doc._id) } });
  } catch (e) {
    console.error('POST /api/admin/landing-knowledge', e);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
