import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Dispensing from '@/models/Dispensing';
import Medicine from '@/models/Medicine';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const paymentStatus = searchParams.get('paymentStatus');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (patientId) query.patientId = patientId;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const dispensings = await Dispensing.find(query).sort({ createdAt: -1 });
    return NextResponse.json(dispensings);
  } catch (error) {
    console.error('Error fetching dispensings:', error);
    return NextResponse.json({ error: 'Failed to fetch dispensings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const data = await request.json();

    // Generate dispensing number
    const count = await Dispensing.countDocuments();
    const date = new Date();
    data.dispensingNumber = `DIS-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(count + 1).padStart(5, '0')}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of data.items) {
      item.totalPrice = item.quantity * item.unitPrice;
      subtotal += item.totalPrice;
    }
    data.subtotal = subtotal;
    data.totalAmount = subtotal - (data.discount || 0);
    data.createdBy = session.user?.id || 'system';

    const dispensing = new Dispensing(data);
    await dispensing.save();

    // Update medicine stock (deduct)
    for (const item of data.items) {
      await Medicine.findByIdAndUpdate(item.medicineId, {
        $inc: { currentStock: -item.quantity }
      });
    }

    return NextResponse.json(dispensing, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating dispensing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create dispensing';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
