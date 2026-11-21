import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import Patient from '@/models/Patient';

/**
 * Bridge between the Qwesi WhatsApp/Facebook AI (separate backend) and this app.
 * Every /api/service/bridge/* route is server-to-server: `x-api-key: HOSPITAL_DASHBOARD_API_KEY`.
 */
export function requireServiceKey(request: NextRequest): NextResponse | null {
  const expected = process.env.HOSPITAL_DASHBOARD_API_KEY;
  if (!expected) return NextResponse.json({ success: false, error: 'Service not configured' }, { status: 500 });
  const provided = request.headers.get('x-api-key') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export const phoneDigits = (phone: string) => String(phone || '').replace(/\D/g, '');
/** Numbers arrive as 233…, +233…, 0… — compare on the last 9 digits. */
export const phoneSuffix = (phone: string) => phoneDigits(phone).slice(-9);

export async function findPatientByPhone(phone: string) {
  const suffix = phoneSuffix(phone);
  if (suffix.length < 9) return null;
  return Patient.findOne({ phone: { $regex: `${suffix}$` } });
}

/** Phone → placeholder email (the Patient schema requires a unique email). Never emailed. */
export const placeholderEmail = (phone: string) => `${phoneDigits(phone)}@phone.qwesi.org`;
export const isPlaceholderEmail = (email?: string) => /@phone\.qwesi\.org$/i.test(email || '');

async function nextPatientId() {
  try {
    const last = await Patient.findOne({}, { patientId: 1 }).sort({ patientId: -1 });
    let n = 1;
    const m = last?.patientId?.match(/PAT-(\d+)/);
    if (m) n = parseInt(m[1], 10) + 1;
    return `PAT-${String(n).padStart(4, '0')}`;
  } catch {
    return `PAT-${Date.now().toString().slice(-6)}`;
  }
}

/** Finds the patient for a phone number or creates a password-less one (must set a password before login). */
export async function ensurePatientByPhone(phone: string, name?: string) {
  const existing = await findPatientByPhone(phone);
  if (existing) return { patient: existing, created: false };
  const digits = phoneDigits(phone);
  if (digits.length < 9) throw new Error('A valid phone number is required');
  const patient = await Patient.create({
    patientId: await nextPatientId(),
    name: (name || '').trim() || `Patient ${digits.slice(-4)}`,
    email: placeholderEmail(phone),
    phone: `+${digits}`,
    // Schema requires these; the patient completes them after first login.
    dateOfBirth: new Date('2000-01-01T12:00:00.000Z'),
    gender: 'prefer-not-to-say',
    approvalStatus: 'approved',
  });
  return { patient, created: true };
}

// ── One-time "set your password" links ──────────────────────────────────────
const secret = () => process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
const b64 = (s: string) => Buffer.from(s).toString('base64url');

export function signSetupToken(patientMongoId: string, ttlHours = 72) {
  const body = b64(JSON.stringify({ p: patientMongoId, e: Date.now() + ttlHours * 3600_000 }));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySetupToken(token: string): string | null {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig || !secret()) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { p, e } = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p && e > Date.now() ? String(p) : null;
  } catch {
    return null;
  }
}

export const siteUrl = (request?: NextRequest) =>
  (process.env.NEXTAUTH_URL || process.env.FRONTEND_URL || request?.nextUrl.origin || '').replace(/\/$/, '');

export const setPasswordUrl = (patientMongoId: string, request?: NextRequest) =>
  `${siteUrl(request)}/set-password?token=${signSetupToken(patientMongoId)}`;
