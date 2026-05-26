import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodDonor from '@/models/BloodDonor';

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

    const donor = await BloodDonor.findById(id);
    if (!donor) {
      return NextResponse.json({ error: 'Blood donor not found' }, { status: 404 });
    }

    return NextResponse.json(donor);
  } catch (error: unknown) {
    console.error('Error fetching blood donor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blood donor';
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

    const donor = await BloodDonor.findById(id);
    if (!donor) {
      return NextResponse.json({ error: 'Blood donor not found' }, { status: 404 });
    }

    // Check if phone is being changed to an existing one
    if (body.phone && body.phone !== donor.phone) {
      const existingPhone = await BloodDonor.findOne({ phone: body.phone, _id: { $ne: id } });
      if (existingPhone) {
        return NextResponse.json(
          { error: 'A donor with this phone number already exists' },
          { status: 400 }
        );
      }
    }

    const updatedDonor = await BloodDonor.findByIdAndUpdate(
      id,
      { $set: body },
      { returnDocument: 'after', runValidators: true }
    );

    return NextResponse.json(updatedDonor);
  } catch (error: unknown) {
    console.error('Error updating blood donor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update blood donor';
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
      return NextResponse.json({ error: 'Only administrators can delete donors' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const donor = await BloodDonor.findById(id);
    if (!donor) {
      return NextResponse.json({ error: 'Blood donor not found' }, { status: 404 });
    }

    await BloodDonor.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Blood donor deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting blood donor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete blood donor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
