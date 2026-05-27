import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import Patient from '../../../../models/Patient';

function numberOrUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized - Patient access only' },
        { status: 401 }
      );
    }

    await dbConnect();

    const patient = await Patient.findOne({ email: session.user.email })
      .select('vitalSigns')
      .lean();

    if (!patient) {
      return NextResponse.json({ vitals: [] });
    }

    const vitals = [...(patient.vitalSigns || [])].sort(
      (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ vitals });
  } catch (error) {
    console.error('Error fetching patient vitals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vitals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized - Patient access only' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const vitalSign = {
      timestamp: new Date(),
      bloodPressure: typeof body.bloodPressure === 'string' ? body.bloodPressure.trim() || undefined : undefined,
      pulse: numberOrUndefined(body.pulse),
      temperature: numberOrUndefined(body.temperature),
      respiratoryRate: numberOrUndefined(body.respiratoryRate),
      oxygenSaturation: numberOrUndefined(body.oxygenSaturation),
      weight: numberOrUndefined(body.weight),
      notes: typeof body.notes === 'string' ? body.notes.trim() || undefined : undefined,
      recordedBy: session.user.name || 'Patient',
      source: 'patient' as const,
    };

    const hasReading = Object.entries(vitalSign).some(([key, value]) =>
      !['timestamp', 'recordedBy', 'source', 'notes'].includes(key) && value !== undefined
    );

    if (!hasReading) {
      return NextResponse.json(
        { error: 'Add at least one vital reading before saving.' },
        { status: 400 }
      );
    }

    await dbConnect();

    const patient = await Patient.findOneAndUpdate(
      { email: session.user.email },
      { $push: { vitalSigns: vitalSign } },
      { returnDocument: 'after' }
    )
      .select('vitalSigns')
      .lean();

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    const vitals = [...(patient.vitalSigns || [])].sort(
      (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ vitals });
  } catch (error) {
    console.error('Error adding patient vitals:', error);
    return NextResponse.json(
      { error: 'Failed to add vitals' },
      { status: 500 }
    );
  }
}
