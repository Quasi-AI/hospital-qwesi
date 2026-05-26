import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Admission from '@/models/Admission';
import Bed from '@/models/Bed';
import Ward from '@/models/Ward';

// POST - Discharge patient
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
        { error: 'Patient already discharged' },
        { status: 400 }
      );
    }

    // Update admission with discharge info
    const dischargeData = {
      status: 'discharged',
      actualDischargeDate: new Date(),
      finalDiagnosis: data.finalDiagnosis || admission.admissionDiagnosis,
      dischargeInfo: {
        dischargeType: data.dischargeType || 'normal',
        dischargeSummary: data.dischargeSummary,
        dischargeInstructions: data.dischargeInstructions,
        followUpDate: data.followUpDate,
        followUpInstructions: data.followUpInstructions,
        medicationsOnDischarge: data.medicationsOnDischarge || [],
        dischargedBy: session.user?.name || 'Unknown',
        dischargedAt: new Date()
      }
    };

    const updatedAdmission = await Admission.findByIdAndUpdate(
      id,
      { $set: dischargeData },
      { new: true }
    );

    // Free the bed
    await Bed.findByIdAndUpdate(admission.bedId, {
      status: 'cleaning',
      currentPatientId: null,
      currentPatientName: null,
      currentAdmissionId: null,
      lastCleanedAt: null
    });

    // Update ward counts
    await Ward.findByIdAndUpdate(admission.wardId, {
      $inc: { occupiedBeds: -1, availableBeds: 1 }
    });

    return NextResponse.json(updatedAdmission);
  } catch (error: unknown) {
    console.error('Error discharging patient:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to discharge patient';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
