import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodTransfusion from '@/models/BloodTransfusion';
import BloodInventory from '@/models/BloodInventory';

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

    const transfusion = await BloodTransfusion.findById(id);
    if (!transfusion) {
      return NextResponse.json({ error: 'Transfusion request not found' }, { status: 404 });
    }

    return NextResponse.json(transfusion);
  } catch (error: unknown) {
    console.error('Error fetching transfusion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transfusion';
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

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const transfusion = await BloodTransfusion.findById(id);
    if (!transfusion) {
      return NextResponse.json({ error: 'Transfusion request not found' }, { status: 404 });
    }

    // Handle status transitions
    if (body.status === 'approved' && transfusion.status === 'pending') {
      body.approvedBy = session.user?.name || session.user?.email;
      body.approvedAt = new Date();
    }

    if (body.status === 'rejected' && !body.rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    if (body.status === 'in-progress' && !transfusion.transfusionStartedAt) {
      body.transfusionStartedAt = new Date();
      body.transfusedBy = session.user?.name || session.user?.email;
    }

    if (body.status === 'completed' && !transfusion.transfusionCompletedAt) {
      body.transfusionCompletedAt = new Date();
      
      // Update blood units status to transfused
      if (transfusion.bloodUnits && transfusion.bloodUnits.length > 0) {
        for (const unit of transfusion.bloodUnits) {
          if (unit.status === 'issued') {
            await BloodInventory.findByIdAndUpdate(unit.unitId, {
              $set: {
                'issuedTo.transfusionId': transfusion._id
              }
            });
          }
        }
        
        // Update blood unit statuses in the transfusion record
        body.bloodUnits = transfusion.bloodUnits.map((unit: { status: string }) => ({
          ...unit,
          status: unit.status === 'issued' ? 'transfused' : unit.status
        }));
      }
    }

    const updatedTransfusion = await BloodTransfusion.findByIdAndUpdate(
      id,
      { $set: body },
      { returnDocument: 'after', runValidators: true }
    );

    return NextResponse.json(updatedTransfusion);
  } catch (error: unknown) {
    console.error('Error updating transfusion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update transfusion';
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

    // Only admin can delete
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete transfusion records' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const transfusion = await BloodTransfusion.findById(id);
    if (!transfusion) {
      return NextResponse.json({ error: 'Transfusion request not found' }, { status: 404 });
    }

    // Don't allow deletion of completed or in-progress transfusions
    if (['completed', 'in-progress'].includes(transfusion.status)) {
      return NextResponse.json(
        { error: 'Cannot delete completed or in-progress transfusion records' },
        { status: 400 }
      );
    }

    await BloodTransfusion.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Transfusion request deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting transfusion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete transfusion';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
