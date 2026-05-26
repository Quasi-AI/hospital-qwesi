import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Ambulance from '@/models/Ambulance';

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

    const ambulance = await Ambulance.findById(id);

    if (!ambulance) {
      return NextResponse.json({ error: 'Ambulance not found' }, { status: 404 });
    }

    return NextResponse.json(ambulance);
  } catch (error: unknown) {
    console.error('Error fetching ambulance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ambulance';
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

    const ambulance = await Ambulance.findById(id);
    if (!ambulance) {
      return NextResponse.json({ error: 'Ambulance not found' }, { status: 404 });
    }

    const body = await request.json();

    // Update fields
    const updateFields = [
      'vehicleNumber', 'vehicleType', 'model', 'manufacturer', 'yearOfManufacture', 'capacity',
      'equipment', 'hasOxygen', 'hasDefibrillator', 'hasStretcher', 'hasVentilator',
      'driverId', 'driverName', 'driverPhone', 'driverLicense',
      'paramedicId', 'paramedicName', 'paramedicPhone',
      'status', 'currentLocation',
      'baseChargePerKm', 'baseCharge', 'currency',
      'registrationNumber', 'registrationExpiry', 'insuranceNumber', 'insuranceExpiry',
      'lastServiceDate', 'nextServiceDue', 'notes', 'isActive'
    ];

    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        (ambulance as Record<string, unknown>)[field] = body[field];
      }
    });

    await ambulance.save();

    return NextResponse.json(ambulance);
  } catch (error: unknown) {
    console.error('Error updating ambulance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update ambulance';
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

    // Only admin can delete ambulances
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete ambulances' }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const ambulance = await Ambulance.findById(id);
    if (!ambulance) {
      return NextResponse.json({ error: 'Ambulance not found' }, { status: 404 });
    }

    // Soft delete - set isActive to false
    ambulance.isActive = false;
    await ambulance.save();

    return NextResponse.json({ message: 'Ambulance deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting ambulance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete ambulance';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
