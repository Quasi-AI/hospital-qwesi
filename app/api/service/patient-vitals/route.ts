import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';

// POST /api/service/patient-vitals
// Body: { phone, bloodPressure?, pulse?, temperature?, respiratoryRate?,
//         oxygenSaturation?, weight?, notes? }
//
// Server-to-server endpoint for the Qwesi WhatsApp/AI assistant, authenticated
// with `x-api-key: <HOSPITAL_DASHBOARD_API_KEY>`. Appends a vitalSigns entry
// to the matching patient's record — the exact same shape and array used by
// the patient's own dashboard (/api/patient-portal/vitals), so anything the
// AI records shows up right alongside vitals the patient logs themselves.
function lastDigits(phone: string, count = 9) {
  const digitsOnly = String(phone || '').replace(/\D/g, '');
  return digitsOnly.slice(-count);
}

function numberOrUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const suffix = lastDigits(body.phone);

    if (!suffix) {
      return NextResponse.json({ success: false, error: 'A valid phone number is required' }, { status: 400 });
    }

    const vitalSign = {
      timestamp: new Date(),
      bloodPressure: typeof body.bloodPressure === 'string' ? body.bloodPressure.trim() || undefined : undefined,
      pulse: numberOrUndefined(body.pulse),
      temperature: numberOrUndefined(body.temperature),
      respiratoryRate: numberOrUndefined(body.respiratoryRate),
      oxygenSaturation: numberOrUndefined(body.oxygenSaturation),
      weight: numberOrUndefined(body.weight),
      notes: typeof body.notes === 'string' ? body.notes.trim() || undefined : undefined,
      recordedBy: 'Qwesi AI (WhatsApp)',
      source: 'patient' as const,
    };

    const hasReading = Object.entries(vitalSign).some(
      ([key, value]) => !['timestamp', 'recordedBy', 'source', 'notes'].includes(key) && value !== undefined
    );

    if (!hasReading) {
      return NextResponse.json({ success: false, error: 'No vital readings provided' }, { status: 400 });
    }

    await dbConnect();

    const patient = await Patient.findOneAndUpdate(
      { phone: { $regex: `${suffix}$` } },
      { $push: { vitalSigns: vitalSign } },
      { new: true }
    )
      .select('patientId name vitalSigns')
      .lean();

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'not_registered', message: 'No patient record found for this phone number' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      patientId: (patient as any).patientId,
      recorded: vitalSign,
    });
  } catch (error) {
    console.error('Error in patient-vitals service endpoint:', error);
    return NextResponse.json({ success: false, error: 'Failed to save vitals' }, { status: 500 });
  }
}
