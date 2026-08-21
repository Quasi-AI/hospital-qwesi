import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';

// GET /api/service/patient-lookup?phone=233595553746
//
// Server-to-server endpoint for the Qwesi WhatsApp/AI assistant, authenticated
// with `x-api-key: <HOSPITAL_DASHBOARD_API_KEY>` (same shared secret used by
// /api/service/hospital-dashboard). Lets the bot check whether a phone number
// already belongs to a registered patient before it tries to store vitals
// against that patient's record, and before deciding whether to show the
// "register as a patient" link.
//
// Phone numbers aren't stored in a single canonical format (patients can
// type them with/without a leading +, spaces, or a local 0-prefix at
// signup), so this matches on the last 9 digits rather than requiring an
// exact string match.
function lastDigits(phone: string, count = 9) {
  const digitsOnly = String(phone || '').replace(/\D/g, '');
  return digitsOnly.slice(-count);
}

export async function GET(request: NextRequest) {
  try {
    const providedKey = request.headers.get('x-api-key');
    const expectedKey = process.env.HOSPITAL_DASHBOARD_API_KEY;

    if (!expectedKey) {
      console.error('HOSPITAL_DASHBOARD_API_KEY is not configured on the server.');
      return NextResponse.json({ success: false, error: 'Service not configured' }, { status: 500 });
    }
    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const phone = request.nextUrl.searchParams.get('phone');
    if (!phone) {
      return NextResponse.json({ success: false, error: 'phone query param is required' }, { status: 400 });
    }

    const suffix = lastDigits(phone);
    if (!suffix) {
      return NextResponse.json({ success: true, isRegistered: false, patient: null });
    }

    await dbConnect();

    const patient = await Patient.findOne({ phone: { $regex: `${suffix}$` } })
      .select('patientId name phone approvalStatus')
      .lean();

    if (!patient) {
      return NextResponse.json({ success: true, isRegistered: false, patient: null });
    }

    return NextResponse.json({
      success: true,
      isRegistered: true,
      patient: {
        patientId: (patient as any).patientId,
        name: (patient as any).name,
        approvalStatus: (patient as any).approvalStatus,
      },
    });
  } catch (error) {
    console.error('Error in patient-lookup service endpoint:', error);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}
