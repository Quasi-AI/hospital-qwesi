import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ensurePatientByPhone, isPlaceholderEmail, requireServiceKey, setPasswordUrl, siteUrl } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

// POST /api/service/bridge/account  { phone, name? }
// Finds or creates the patient for a WhatsApp/Facebook phone number. The phone is their login.
// A new account has no password, so the response carries a one-time link to set one first.
export async function POST(request: NextRequest) {
  const denied = requireServiceKey(request);
  if (denied) return denied;
  try {
    const { phone, name } = await request.json();
    if (!phone) return NextResponse.json({ success: false, error: 'phone is required' }, { status: 400 });
    await dbConnect();
    const { patient, created } = await ensurePatientByPhone(String(phone), name);
    const hasPassword = Boolean(patient.password);
    return NextResponse.json({
      success: true,
      created,
      patientId: patient.patientId,
      name: patient.name,
      hasPassword,
      loginUrl: `${siteUrl(request)}/login`,
      setPasswordUrl: hasPassword ? null : setPasswordUrl(String(patient._id), request),
      usesPlaceholderEmail: isPlaceholderEmail(patient.email),
    });
  } catch (e: any) {
    console.error('bridge/account', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to prepare account' }, { status: 500 });
  }
}
