import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Admission from '@/models/Admission';

// POST - Add vital signs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const data = await request.json();

    const admission = await Admission.findById(id);
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }

    if (admission.status === 'discharged') {
      return NextResponse.json(
        { error: 'Cannot add vitals to discharged patient' },
        { status: 400 }
      );
    }

    const vitalSign = {
      timestamp: new Date(),
      bloodPressure: data.bloodPressure,
      pulse: data.pulse,
      temperature: data.temperature,
      respiratoryRate: data.respiratoryRate,
      oxygenSaturation: data.oxygenSaturation,
      weight: data.weight,
      notes: data.notes,
      recordedBy: session.user?.name || 'Unknown'
    };

    const updatedAdmission = await Admission.findByIdAndUpdate(
      id,
      { $push: { vitalSigns: vitalSign } },
      { new: true }
    );

    return NextResponse.json(updatedAdmission);
  } catch (error: unknown) {
    console.error('Error adding vital signs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add vital signs';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
