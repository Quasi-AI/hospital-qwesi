import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import PublicBookingOtp from '@/models/PublicBookingOtp';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import { getDefaultPhoneCountry } from '@/lib/phoneDefaultCountry';
import { phoneDigitsForMatch } from '@/lib/phoneNormalize';
import { signBookingVerificationToken } from '@/lib/publicBookingToken';

function hashOtp(code: string, phoneKey: string): string {
  const secret =
    process.env.BOOKING_VERIFY_SECRET || process.env.NEXTAUTH_SECRET || 'dev-only-change-in-production';
  return crypto.createHash('sha256').update(`${secret}:${phoneKey}:${code}`).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phoneRaw = String((body as Record<string, unknown>)?.phone ?? '').trim();
    const code = String((body as Record<string, unknown>)?.code ?? '').trim().replace(/\s/g, '');

    if (phoneRaw.length < 5 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    await dbConnect();
    const content = await getMergedWebsiteContent();
    if (!content.appointmentRequestEnabled) {
      return NextResponse.json({ error: 'disabled' }, { status: 403 });
    }

    const defaultCountry = await getDefaultPhoneCountry();
    const phoneKey = phoneDigitsForMatch(phoneRaw, defaultCountry);
    if (phoneKey.length < 10) {
      return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
    }

    const otpDoc = await PublicBookingOtp.findOne({ phoneKey }).sort({ createdAt: -1 }).lean();
    if (!otpDoc || new Date(otpDoc.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'invalid_or_expired' }, { status: 400 });
    }

    const expectedHash = hashOtp(code, phoneKey);
    let match = false;
    try {
      const a = Buffer.from(String(otpDoc.codeHash), 'hex');
      const b = Buffer.from(expectedHash, 'hex');
      if (a.length === b.length && a.length > 0) {
        match = crypto.timingSafeEqual(a, b);
      }
    } catch {
      match = false;
    }
    if (!match) {
      return NextResponse.json({ error: 'invalid_or_expired' }, { status: 400 });
    }

    const patient = await Patient.findById(otpDoc.patientId).select('name email phone').lean();
    if (!patient) {
      await PublicBookingOtp.deleteMany({ phoneKey });
      return NextResponse.json({ error: 'patient_missing' }, { status: 400 });
    }

    if (phoneDigitsForMatch(patient.phone || '', defaultCountry) !== phoneKey) {
      await PublicBookingOtp.deleteMany({ phoneKey });
      return NextResponse.json({ error: 'invalid_or_expired' }, { status: 400 });
    }

    await PublicBookingOtp.deleteMany({ phoneKey });

    const token = signBookingVerificationToken({
      patientId: String(patient._id),
      phoneKey,
    });

    return NextResponse.json({
      ok: true,
      bookingVerificationToken: token,
      patient: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
      },
    });
  } catch (e) {
    console.error('POST /api/public/booking/otp/verify', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
