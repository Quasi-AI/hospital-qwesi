import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Bed from '@/models/Bed';
import Ward from '@/models/Ward';

// GET - List all beds
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get('wardId');
    const status = searchParams.get('status');
    const isActive = searchParams.get('isActive');

    // Build query
    const query: Record<string, unknown> = {};
    
    if (wardId) {
      query.wardId = wardId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const beds = await Bed.find(query).sort({ wardName: 1, bedNumber: 1 });

    return NextResponse.json(beds);
  } catch (error) {
    console.error('Error fetching beds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beds' },
      { status: 500 }
    );
  }
}

// POST - Create new bed
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const data = await request.json();

    // Get ward info
    const ward = await Ward.findById(data.wardId);
    if (!ward) {
      return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
    }

    // Set ward info
    data.wardName = ward.name;
    data.wardType = ward.type;

    // Set default daily rate from ward if not provided
    if (!data.dailyRate) {
      data.dailyRate = ward.dailyRate;
    }

    const bed = new Bed(data);
    await bed.save();

    // Update ward bed counts
    await Ward.findByIdAndUpdate(data.wardId, {
      $inc: { totalBeds: 1, availableBeds: 1 }
    });

    return NextResponse.json(bed, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating bed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create bed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
