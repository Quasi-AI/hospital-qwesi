import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import Medicine from '@/models/Medicine';
import InventoryItem from '@/models/InventoryItem';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const order = await PurchaseOrder.findById(id);
    if (!order) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const data = await request.json();
    const existingOrder = await PurchaseOrder.findById(id);
    if (!existingOrder) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });

    // Handle status changes
    if (data.status === 'approved' && existingOrder.status !== 'approved') {
      data.approvedBy = session.user?.name || session.user?.email || 'Unknown';
      data.approvedAt = new Date();
    }

    // Handle receiving items - update stock
    if (data.status === 'received' && existingOrder.status !== 'received') {
      data.receivedBy = session.user?.name || session.user?.email || 'Unknown';
      data.receivedAt = new Date();
      data.actualDeliveryDate = new Date();

      // Update stock for each item
      for (const item of existingOrder.items) {
        const Model = item.itemType === 'medicine' ? Medicine : InventoryItem;
        await Model.findByIdAndUpdate(item.itemId, {
          $inc: { currentStock: item.quantity }
        });
      }
    }

    const order = await PurchaseOrder.findByIdAndUpdate(id, { $set: data }, { new: true });
    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error('Error updating purchase order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update purchase order';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const order = await PurchaseOrder.findById(id);
    if (!order) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });

    if (order.status !== 'draft' && order.status !== 'cancelled') {
      return NextResponse.json({ error: 'Can only delete draft or cancelled orders' }, { status: 400 });
    }

    await PurchaseOrder.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return NextResponse.json({ error: 'Failed to delete purchase order' }, { status: 500 });
  }
}
