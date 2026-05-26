import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
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

    const item = await BloodInventory.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Blood inventory item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error('Error fetching blood inventory item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blood inventory item';
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

    const item = await BloodInventory.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Blood inventory item not found' }, { status: 404 });
    }

    // Handle testing status updates
    if (body.testingStatus === 'cleared') {
      // Check if all tests are negative
      const allTestsNegative = 
        body.hivTest === 'negative' &&
        body.hbsAgTest === 'negative' &&
        body.hcvTest === 'negative' &&
        body.vdrlTest === 'negative' &&
        body.malariaTest === 'negative';

      if (allTestsNegative && item.status === 'quarantine') {
        body.status = 'available';
      }
    }

    if (body.testingStatus === 'rejected') {
      body.status = 'discarded';
    }

    // Handle expiry
    if (item.expiryDate < new Date() && item.status !== 'expired' && item.status !== 'discarded' && item.status !== 'issued') {
      body.status = 'expired';
    }

    const updatedItem = await BloodInventory.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedItem);
  } catch (error: unknown) {
    console.error('Error updating blood inventory item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update blood inventory item';
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
      return NextResponse.json({ error: 'Only administrators can delete blood inventory items' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const item = await BloodInventory.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Blood inventory item not found' }, { status: 404 });
    }

    // Don't allow deletion of issued items
    if (item.status === 'issued') {
      return NextResponse.json({ error: 'Cannot delete an issued blood unit' }, { status: 400 });
    }

    await BloodInventory.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Blood inventory item deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting blood inventory item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete blood inventory item';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
