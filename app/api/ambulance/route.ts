import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Ambulance from '@/models/Ambulance';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vehicleType = searchParams.get('vehicleType');
    const availableOnly = searchParams.get('availableOnly');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = { isActive: true };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (vehicleType && vehicleType !== 'all') {
      query.vehicleType = vehicleType;
    }

    if (availableOnly === 'true') {
      query.status = 'available';
    }

    if (search) {
      query.$or = [
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
      ];
    }

    const ambulances = await Ambulance.find(query).sort({ vehicleNumber: 1 });

    return NextResponse.json(ambulances);
  } catch (error: unknown) {
    console.error('Error fetching ambulances:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ambulances';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can add ambulances
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can add ambulances' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();

    if (!body.vehicleNumber || !body.vehicleType || !body.model) {
      return NextResponse.json(
        { error: 'Vehicle number, type, and model are required' },
        { status: 400 }
      );
    }

    // Check for duplicate vehicle number
    const existing = await Ambulance.findOne({ vehicleNumber: body.vehicleNumber });
    if (existing) {
      return NextResponse.json(
        { error: 'An ambulance with this vehicle number already exists' },
        { status: 400 }
      );
    }

    const ambulance = new Ambulance({
      ...body,
      createdBy: session.user?.email || 'Unknown',
    });

    await ambulance.save();

    return NextResponse.json(ambulance, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating ambulance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create ambulance';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
