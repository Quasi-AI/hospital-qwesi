import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import PublicBookingOtp from '@/models/PublicBookingOtp';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import { getDefaultPhoneCountry } from '@/lib/phoneDefaultCountry';
import { phoneDigitsForMatch, phoneMatchRegex } from '@/lib/phoneNormalize';
import { sendSMS } from '@/lib/notifications/sms-provider';

function hashOtp(code: string, phoneKey: string): string {
  const secret =
    process.env.BOOKING_VERIFY_SECRET || process.env.NEXTAUTH_SECRET || 'dev-only-change-in-production';
  return crypto.createHash('sha256').update(`${secret}:${phoneKey}:${code}`).digest('hex');
}

/**
 * Send SMS OTP for returning patients (phone must match a Patient record).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phoneRaw = String((body as Record<string, unknown>)?.phone ?? '').trim();
    if (phoneRaw.length < 5) {
      return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
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

    const patient = await Patient.findOne({ phone: phoneMatchRegex(phoneKey) })
      .select('_id name phone')
      .lean();

    if (!patient) {
      return NextResponse.json({ error: 'patient_not_found' }, { status: 404 });
    }

    const recent = await PublicBookingOtp.findOne({ phoneKey }).sort({ createdAt: -1 }).lean();
    if (recent?.createdAt && Date.now() - new Date(recent.createdAt).getTime() < 60_000) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = hashOtp(code, phoneKey);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const sms = await sendSMS({
      to: String(patient.phone || phoneRaw),
      message: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this message.`,
    });

    if (!sms.success) {
      return NextResponse.json(
        {
          error: 'sms_unavailable',
          detail: sms.error || 'SMS could not be sent',
        },
        { status: 503 }
      );
    }

    await PublicBookingOtp.deleteMany({ phoneKey });
    await PublicBookingOtp.create({
      phoneKey,
      codeHash,
      patientId: patient._id,
      expiresAt,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('POST /api/public/booking/otp/send', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
