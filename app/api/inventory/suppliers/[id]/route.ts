import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Supplier from '@/models/Supplier';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const supplier = await Supplier.findById(id);
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const data = await request.json();
    const supplier = await Supplier.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    return NextResponse.json(supplier);
  } catch (error: unknown) {
    console.error('Error updating supplier:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update supplier';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    return NextResponse.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
  }
}
