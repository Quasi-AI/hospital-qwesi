import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const paymentStatus = searchParams.get('paymentStatus');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (supplierId) query.supplierId = supplierId;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await PurchaseOrder.find(query).sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const data = await request.json();

    // Generate order number
    const count = await PurchaseOrder.countDocuments();
    const date = new Date();
    data.orderNumber = `PO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(5, '0')}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of data.items) {
      item.totalCost = item.quantity * item.unitCost;
      subtotal += item.totalCost;
    }
    data.subtotal = subtotal;
    data.totalAmount = subtotal + (data.taxAmount || 0) + (data.shippingCost || 0) - (data.discount || 0);
    data.createdBy = session.user?.id || 'system';

    const order = new PurchaseOrder(data);
    await order.save();

    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating purchase order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create purchase order';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
