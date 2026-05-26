import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Ward from '@/models/Ward';

// GET - List all wards
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const hasAvailableBeds = searchParams.get('hasAvailableBeds');

    // Build query
    const query: Record<string, unknown> = {};
    
    if (type) {
      query.type = type;
    }
    
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (hasAvailableBeds === 'true') {
      query.availableBeds = { $gt: 0 };
    }

    const wards = await Ward.find(query).sort({ wardNumber: 1 });

    return NextResponse.json(wards);
  } catch (error) {
    console.error('Error fetching wards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wards' },
      { status: 500 }
    );
  }
}

// POST - Create new ward
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const data = await request.json();

    // Generate ward number
    const count = (await Ward.countDocuments()) || 0;
    const sequence = String(count + 1).padStart(3, '0');
    data.wardNumber = `W-${sequence}`;

    // Set available beds equal to total beds initially
    data.availableBeds = data.totalBeds || 0;
    data.occupiedBeds = 0;

    const ward = new Ward(data);
    await ward.save();

    return NextResponse.json(ward, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating ward:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create ward';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
