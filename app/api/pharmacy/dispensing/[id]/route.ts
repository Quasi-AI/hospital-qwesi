import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Dispensing from '@/models/Dispensing';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const dispensing = await Dispensing.findById(id);
    if (!dispensing) return NextResponse.json({ error: 'Dispensing record not found' }, { status: 404 });

    return NextResponse.json(dispensing);
  } catch (error) {
    console.error('Error fetching dispensing:', error);
    return NextResponse.json({ error: 'Failed to fetch dispensing' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const data = await request.json();

    // Handle status changes
    if (data.status === 'dispensed' && !data.dispensedAt) {
      data.dispensedAt = new Date();
      data.dispensedBy = session.user?.name || session.user?.email || 'Unknown';
    }

    const dispensing = await Dispensing.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!dispensing) return NextResponse.json({ error: 'Dispensing record not found' }, { status: 404 });

    return NextResponse.json(dispensing);
  } catch (error: unknown) {
    console.error('Error updating dispensing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update dispensing';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
