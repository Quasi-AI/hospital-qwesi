import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Medicine from '@/models/Medicine';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const medicine = await Medicine.findById(id);
    if (!medicine) return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });

    return NextResponse.json(medicine);
  } catch (error) {
    console.error('Error fetching medicine:', error);
    return NextResponse.json({ error: 'Failed to fetch medicine' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const data = await request.json();
    const medicine = await Medicine.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!medicine) return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });

    return NextResponse.json(medicine);
  } catch (error: unknown) {
    console.error('Error updating medicine:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update medicine';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const medicine = await Medicine.findByIdAndDelete(id);
    if (!medicine) return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });

    return NextResponse.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    return NextResponse.json({ error: 'Failed to delete medicine' }, { status: 500 });
  }
}
