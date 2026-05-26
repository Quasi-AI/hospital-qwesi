import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import RadiologyStudy from '@/models/RadiologyStudy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const study = await RadiologyStudy.findById(id);
    if (!study) return NextResponse.json({ error: 'Study not found' }, { status: 404 });

    return NextResponse.json(study);
  } catch (error) {
    console.error('Error fetching radiology study:', error);
    return NextResponse.json({ error: 'Failed to fetch radiology study' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const data = await request.json();
    const study = await RadiologyStudy.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!study) return NextResponse.json({ error: 'Study not found' }, { status: 404 });

    return NextResponse.json(study);
  } catch (error: unknown) {
    console.error('Error updating radiology study:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update radiology study';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const study = await RadiologyStudy.findByIdAndDelete(id);
    if (!study) return NextResponse.json({ error: 'Study not found' }, { status: 404 });

    return NextResponse.json({ message: 'Study deleted successfully' });
  } catch (error) {
    console.error('Error deleting radiology study:', error);
    return NextResponse.json({ error: 'Failed to delete radiology study' }, { status: 500 });
  }
}
