import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import EmergencyCase from '@/models/EmergencyCase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const emergencyCase = await EmergencyCase.findById(id);

    if (!emergencyCase) {
      return NextResponse.json({ error: 'Emergency case not found' }, { status: 404 });
    }

    return NextResponse.json(emergencyCase);
  } catch (error: unknown) {
    console.error('Error fetching emergency case:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emergency case';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const emergencyCase = await EmergencyCase.findById(id);
    if (!emergencyCase) {
      return NextResponse.json({ error: 'Emergency case not found' }, { status: 404 });
    }

    const body = await request.json();

    // Handle status changes with time tracking
    if (body.status && body.status !== emergencyCase.status) {
      const now = new Date();
      
      // Track when treatment starts
      if (body.status === 'in-treatment' && !emergencyCase.treatmentStartTime) {
        emergencyCase.treatmentStartTime = now;
        // Calculate waiting time
        if (emergencyCase.waitingStartTime) {
          emergencyCase.totalWaitingTime = Math.round(
            (now.getTime() - new Date(emergencyCase.waitingStartTime).getTime()) / 60000
          );
        }
      }
      
      // Track when treatment ends
      if (['discharged', 'admitted', 'transferred', 'deceased', 'left-ama'].includes(body.status)) {
        emergencyCase.treatmentEndTime = now;
        if (emergencyCase.treatmentStartTime) {
          emergencyCase.totalTreatmentTime = Math.round(
            (now.getTime() - new Date(emergencyCase.treatmentStartTime).getTime()) / 60000
          );
        }
      }
      
      emergencyCase.status = body.status;
    }

    // Update basic fields
    if (body.triageLevel) emergencyCase.triageLevel = body.triageLevel;
    if (body.triageNotes !== undefined) emergencyCase.triageNotes = body.triageNotes;
    if (body.chiefComplaint) emergencyCase.chiefComplaint = body.chiefComplaint;
    if (body.arrivalMode) emergencyCase.arrivalMode = body.arrivalMode;
    if (body.injuryType) emergencyCase.injuryType = body.injuryType;
    if (body.symptoms) emergencyCase.symptoms = body.symptoms;
    if (body.allergies) emergencyCase.allergies = body.allergies;
    if (body.currentMedications) emergencyCase.currentMedications = body.currentMedications;
    if (body.diagnosis !== undefined) emergencyCase.diagnosis = body.diagnosis;
    if (body.treatmentNotes !== undefined) emergencyCase.treatmentNotes = body.treatmentNotes;
    if (body.attendingDoctorId) emergencyCase.attendingDoctorId = body.attendingDoctorId;
    if (body.attendingDoctorName) emergencyCase.attendingDoctorName = body.attendingDoctorName;
    if (body.nurseInCharge !== undefined) emergencyCase.nurseInCharge = body.nurseInCharge;
    if (body.notes !== undefined) emergencyCase.notes = body.notes;
    if (body.disposition) emergencyCase.disposition = body.disposition;

    // Handle transfer
    if (body.transferTo) {
      emergencyCase.transferTo = body.transferTo;
      emergencyCase.transferReason = body.transferReason;
      emergencyCase.transferredAt = new Date();
      emergencyCase.status = 'transferred';
      emergencyCase.disposition = 'transferred';
    }

    // Handle admission
    if (body.admissionId) {
      emergencyCase.admissionId = body.admissionId;
      emergencyCase.admittedToWard = body.admittedToWard;
      emergencyCase.status = 'admitted';
      emergencyCase.disposition = 'admitted';
    }

    // Handle discharge
    if (body.dischargeInstructions !== undefined || body.status === 'discharged') {
      if (body.status === 'discharged') {
        emergencyCase.dischargedAt = new Date();
        emergencyCase.dischargedBy = session.user?.name || session.user?.email;
        emergencyCase.disposition = 'discharged';
      }
      if (body.dischargeInstructions !== undefined) {
        emergencyCase.dischargeInstructions = body.dischargeInstructions;
      }
      if (body.followUpRequired !== undefined) {
        emergencyCase.followUpRequired = body.followUpRequired;
      }
      if (body.followUpDate) {
        emergencyCase.followUpDate = new Date(body.followUpDate);
      }
    }

    // Add vital signs
    if (body.newVitalSigns) {
      emergencyCase.vitalSigns.push({
        ...body.newVitalSigns,
        recordedAt: new Date(),
        recordedBy: session.user?.name || session.user?.email,
      });
    }

    // Add procedure
    if (body.newProcedure) {
      emergencyCase.procedures.push({
        ...body.newProcedure,
        performedAt: new Date(),
        performedBy: body.newProcedure.performedBy || session.user?.name || session.user?.email,
      });
    }

    // Add medication
    if (body.newMedication) {
      emergencyCase.medications.push({
        ...body.newMedication,
        administeredAt: new Date(),
        administeredBy: body.newMedication.administeredBy || session.user?.name || session.user?.email,
      });
    }

    await emergencyCase.save();

    return NextResponse.json(emergencyCase);
  } catch (error: unknown) {
    console.error('Error updating emergency case:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update emergency case';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete emergency cases
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete emergency cases' }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const emergencyCase = await EmergencyCase.findById(id);
    if (!emergencyCase) {
      return NextResponse.json({ error: 'Emergency case not found' }, { status: 404 });
    }

    await EmergencyCase.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Emergency case deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting emergency case:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete emergency case';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
