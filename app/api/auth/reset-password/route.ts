import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Patient from '@/models/Patient';
import { readResetToken, resetFingerprint } from '@/lib/passwordReset';

export const dynamic = 'force-dynamic';

async function load(token: string) {
  const t = readResetToken(token);
  if (!t) return null;
  await dbConnect();
  const account: any = await (t.kind === 'user' ? User : Patient).findById(t.id);
  if (!account || resetFingerprint(account.password) !== t.f) return null; // password already changed => link is spent
  return { t, account };
}

// GET ?token= -> { valid, name }
export async function GET(request: NextRequest) {
  const r = await load(request.nextUrl.searchParams.get('token') || '');
  return NextResponse.json(r ? { valid: true, name: r.account.name } : { valid: false });
}

// POST { token, password }
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    const r = await load(String(token || ''));
    if (!r) return NextResponse.json({ error: 'This link is invalid, expired or already used. Please ask for a new one.' }, { status: 400 });
    const hash = await bcrypt.hash(password, 12);
    await (r.t.kind === 'user' ? User : Patient).updateOne({ _id: r.account._id }, { $set: { password: hash } });
    // keep a linked patient record in sync when a patient also has a User login
    if (r.t.kind === 'user' && r.account.role === 'patient') await Patient.updateOne({ email: r.account.email }, { $set: { password: hash } }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('reset-password', e);
    return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
  }
}
