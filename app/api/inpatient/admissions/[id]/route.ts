import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Admission from '@/models/Admission';
import Bed from '@/models/Bed';
import Ward from '@/models/Ward';

// GET - Get single admission
export async function GET(
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

    const admission = await Admission.findById(id);
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }

    return NextResponse.json(admission);
  } catch (error) {
    console.error('Error fetching admission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admission' },
      { status: 500 }
    );
  }
}

// PUT - Update admission
export async function PUT(
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

    const currentAdmission = await Admission.findById(id);
    if (!currentAdmission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }

    // Handle bed transfer
    if (data.bedId && data.bedId !== currentAdmission.bedId.toString()) {
      const newBed = await Bed.findById(data.bedId);
      if (!newBed || newBed.status !== 'available') {
        return NextResponse.json(
          { error: 'New bed is not available' },
          { status: 400 }
        );
      }

      // Free old bed
      await Bed.findByIdAndUpdate(currentAdmission.bedId, {
        status: 'cleaning',
        currentPatientId: null,
        currentPatientName: null,
        currentAdmissionId: null
      });

      // Update old ward counts if changing wards
      if (data.wardId && data.wardId !== currentAdmission.wardId.toString()) {
        await Ward.findByIdAndUpdate(currentAdmission.wardId, {
          $inc: { occupiedBeds: -1, availableBeds: 1 }
        });
        
        const newWard = await Ward.findById(data.wardId);
        if (newWard) {
          data.wardName = newWard.name;
          await Ward.findByIdAndUpdate(data.wardId, {
            $inc: { occupiedBeds: 1, availableBeds: -1 }
          });
        }
      }

      // Occupy new bed
      await Bed.findByIdAndUpdate(data.bedId, {
        status: 'occupied',
        currentPatientId: currentAdmission.patientId,
        currentPatientName: currentAdmission.patientName,
        currentAdmissionId: id
      });

      data.bedNumber = newBed.bedNumber;
    }

    const admission = await Admission.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    return NextResponse.json(admission);
  } catch (error: unknown) {
    console.error('Error updating admission:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update admission';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/Delete admission (only for pending admissions)
export async function DELETE(
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

    const admission = await Admission.findById(id);
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }

    // Cannot delete discharged or deceased admissions
    if (['discharged', 'deceased'].includes(admission.status)) {
      return NextResponse.json(
        { error: 'Cannot delete completed admission records' },
        { status: 400 }
      );
    }

    // Free the bed
    await Bed.findByIdAndUpdate(admission.bedId, {
      status: 'cleaning',
      currentPatientId: null,
      currentPatientName: null,
      currentAdmissionId: null
    });

    // Update ward counts
    await Ward.findByIdAndUpdate(admission.wardId, {
      $inc: { occupiedBeds: -1, availableBeds: 1 }
    });

    await Admission.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Admission deleted successfully' });
  } catch (error) {
    console.error('Error deleting admission:', error);
    return NextResponse.json(
      { error: 'Failed to delete admission' },
      { status: 500 }
    );
  }
}
