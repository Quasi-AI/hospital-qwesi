import { normalizePhone, phoneTail } from '@/lib/phone';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';

export const maxDuration = 60;
const ACTIONS = new Set(['session', 'speak', 'turn', 'look', 'topup']);

/**
 * Patient-authenticated proxy to the Qwesi AI backend (brain, credits, voice).
 * The backend key never reaches the browser; the patient's phone comes from their account.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!ACTIONS.has(action)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const base = (process.env.QWESI_BACKEND_URL || '').replace(/\/+$/, '');
  const key = process.env.HOSPITAL_DASHBOARD_API_KEY;
  if (!base || !key) return NextResponse.json({ error: 'The AI doctor is not configured yet.' }, { status: 503 });

  await dbConnect();
  const patient: any = await Patient.findOne({ email: session.user.email }).select('phone').lean();
  const phone = normalizePhone(patient?.phone);
  if (phone.length < 9) return NextResponse.json({ error: 'Please add your phone number in your profile first. Your credits are linked to it.' }, { status: 400 });

  // A credit balance belongs to ONE phone number. If another patient account uses the same number, nobody can spend
  // those credits through the web until the admin sorts out who owns the number.
  const last9 = phoneTail(phone);
  const sharing = await Patient.countDocuments({ email: { $ne: session.user.email }, phone: { $regex: `${last9}\\s*$` } });
  if (sharing > 0) {
    return NextResponse.json({ error: 'This phone number is already used by another account, so its credits cannot be used here. Please use your own phone number in your profile, or contact support.' }, { status: 409 });
  }

  try {
    let res: Response;
    if (action === 'turn') {
      const audio = await request.arrayBuffer();
      if (audio.byteLength > 6_000_000) return NextResponse.json({ error: 'Audio too long' }, { status: 413 });
      res = await fetch(`${base}/api/ai-doctor/turn`, {
        method: 'POST', body: audio, signal: AbortSignal.timeout(55_000),
        headers: { 'content-type': request.headers.get('content-type') || 'audio/wav', 'x-api-key': key, 'x-phone': phone },
      });
    } else {
      const body = await request.json().catch(() => ({}));
      if (action === 'topup') body.amount = Math.min(1000, Math.max(1, Math.floor(Number(body.amount) || 0)));
      res = await fetch(`${base}/api/ai-doctor/${action}`, {
        method: 'POST', signal: AbortSignal.timeout(55_000),
        headers: { 'content-type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({ ...body, phone }),
      });
    }
    const data = await res.json().catch(() => ({ success: false, error: 'Bad response from the AI service' }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'The AI doctor could not be reached. Please try again.' }, { status: 502 });
  }
}
