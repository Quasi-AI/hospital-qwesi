import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Ward from '@/models/Ward';
import Bed from '@/models/Bed';

// GET - Get single ward
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

    const ward = await Ward.findById(id);
    if (!ward) {
      return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
    }

    // Get beds in this ward
    const beds = await Bed.find({ wardId: id }).sort({ bedNumber: 1 });

    return NextResponse.json({ ward, beds });
  } catch (error) {
    console.error('Error fetching ward:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ward' },
      { status: 500 }
    );
  }
}

// PUT - Update ward
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

    // Recalculate available beds if total beds changed
    if (data.totalBeds !== undefined) {
      const currentWard = await Ward.findById(id);
      if (currentWard) {
        data.availableBeds = data.totalBeds - currentWard.occupiedBeds;
      }
    }

    const ward = await Ward.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!ward) {
      return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
    }

    return NextResponse.json(ward);
  } catch (error: unknown) {
    console.error('Error updating ward:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update ward';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete ward
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

    // Check if there are occupied beds in this ward
    const occupiedBeds = await Bed.countDocuments({ 
      wardId: id, 
      status: 'occupied' 
    });

    if (occupiedBeds > 0) {
      return NextResponse.json(
        { error: 'Cannot delete ward with occupied beds' },
        { status: 400 }
      );
    }

    // Delete all beds in this ward first
    await Bed.deleteMany({ wardId: id });

    const ward = await Ward.findByIdAndDelete(id);
    if (!ward) {
      return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Ward deleted successfully' });
  } catch (error) {
    console.error('Error deleting ward:', error);
    return NextResponse.json(
      { error: 'Failed to delete ward' },
      { status: 500 }
    );
  }
}
