import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Patient from '@/models/Patient';
import { permanentDeleteAccount, restoreAccount, softDeleteAccount, type AccountType } from '@/lib/accountDeletion';

async function adminSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin' ? session : null;
}

/** GET ?type=user|patient[&role=doctor|herbalist|pharmacy] -> archived (soft-deleted) accounts */
export async function GET(request: NextRequest) {
  if (!(await adminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const sp = new URL(request.url).searchParams;
  const type = sp.get('type') === 'patient' ? 'patient' : 'user';
  const role = sp.get('role');
  await dbConnect();
  const filter: any = { deletedAt: { $exists: true } };
  if (type === 'user') {
    if (role === 'herbalist') Object.assign(filter, { role: 'doctor', practitionerType: 'herbalist' });
    else if (role === 'doctor') filter.role = 'doctor';
    else if (role === 'pharmacy') filter.role = 'pharmacy';
    else filter.role = { $in: ['doctor', 'pharmacy'] };
  }
  const rows = await (type === 'patient' ? Patient : User)
    .find(filter)
    .select('name originalEmail originalPhone role practitionerType deletedAt')
    .sort({ deletedAt: -1 })
    .lean();
  return NextResponse.json(rows);
}

/** POST {type, id, action: 'soft' | 'restore' | 'permanent'} */
export async function POST(request: NextRequest) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const type: AccountType = body.type === 'patient' ? 'patient' : 'user';
  const id = String(body.id || '');
  await dbConnect();
  const adminId = String(session.user.id || '');
  const result =
    body.action === 'soft' ? await softDeleteAccount(type, id, adminId)
    : body.action === 'restore' ? await restoreAccount(type, id)
    : body.action === 'permanent' ? await permanentDeleteAccount(type, id, adminId)
    : ({ ok: false, status: 400, error: 'Unknown action' } as const);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true });
}
