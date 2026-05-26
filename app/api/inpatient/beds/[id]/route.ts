import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Bed from '@/models/Bed';
import Ward from '@/models/Ward';

// GET - Get single bed
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

    const bed = await Bed.findById(id);
    if (!bed) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    return NextResponse.json(bed);
  } catch (error) {
    console.error('Error fetching bed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bed' },
      { status: 500 }
    );
  }
}

// PUT - Update bed
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

    const currentBed = await Bed.findById(id);
    if (!currentBed) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    // If status is changing, update ward counts
    if (data.status && data.status !== currentBed.status) {
      const wasOccupied = currentBed.status === 'occupied';
      const willBeOccupied = data.status === 'occupied';

      if (wasOccupied && !willBeOccupied) {
        // Bed is being freed
        await Ward.findByIdAndUpdate(currentBed.wardId, {
          $inc: { occupiedBeds: -1, availableBeds: 1 }
        });
      } else if (!wasOccupied && willBeOccupied) {
        // Bed is being occupied
        await Ward.findByIdAndUpdate(currentBed.wardId, {
          $inc: { occupiedBeds: 1, availableBeds: -1 }
        });
      }
    }

    const bed = await Bed.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    return NextResponse.json(bed);
  } catch (error: unknown) {
    console.error('Error updating bed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update bed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete bed
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

    const bed = await Bed.findById(id);
    if (!bed) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    // Cannot delete occupied bed
    if (bed.status === 'occupied') {
      return NextResponse.json(
        { error: 'Cannot delete an occupied bed' },
        { status: 400 }
      );
    }

    // Update ward counts
    const updateData: Record<string, number> = { totalBeds: -1 };
    if (bed.status === 'available') {
      updateData.availableBeds = -1;
    }

    await Ward.findByIdAndUpdate(bed.wardId, { $inc: updateData });

    await Bed.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Bed deleted successfully' });
  } catch (error) {
    console.error('Error deleting bed:', error);
    return NextResponse.json(
      { error: 'Failed to delete bed' },
      { status: 500 }
    );
  }
}
