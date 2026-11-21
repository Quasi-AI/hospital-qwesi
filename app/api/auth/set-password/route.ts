import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import { verifySetupToken } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

// GET  ?token=  -> { valid, name, phone }   (lets the page greet the user)
// POST { token, password } -> sets the first password. Works once: afterwards the account has a password.
export async function GET(request: NextRequest) {
  const id = verifySetupToken(request.nextUrl.searchParams.get('token') || '');
  if (!id) return NextResponse.json({ valid: false });
  await dbConnect();
  const p = await Patient.findById(id).select('name phone password').lean<{ name: string; phone: string; password?: string }>();
  if (!p || p.password) return NextResponse.json({ valid: false, alreadySet: Boolean(p?.password) });
  return NextResponse.json({ valid: true, name: p.name, phone: p.phone });
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    const id = verifySetupToken(String(token || ''));
    if (!id) return NextResponse.json({ error: 'This link is invalid or has expired. Ask Qwesi on WhatsApp for a new one.' }, { status: 400 });
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    await dbConnect();
    const p = await Patient.findById(id);
    if (!p) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (p.password) return NextResponse.json({ error: 'A password is already set. Please log in.' }, { status: 409 });
    p.password = await bcrypt.hash(password, 12);
    await p.save();
    return NextResponse.json({ ok: true, phone: p.phone });
  } catch (e) {
    console.error('set-password', e);
    return NextResponse.json({ error: 'Could not set password' }, { status: 500 });
  }
}
