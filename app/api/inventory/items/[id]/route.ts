import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import InventoryItem from '@/models/InventoryItem';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const item = await InventoryItem.findById(id);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const data = await request.json();
    const item = await InventoryItem.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error('Error updating inventory item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update inventory item';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const item = await InventoryItem.findByIdAndDelete(id);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}
