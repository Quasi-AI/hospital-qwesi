import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const invoiceId = searchParams.get('invoiceId');
    const patientId = searchParams.get('patientId');

    let query: any = {};

    if (invoiceId) {
      query.invoiceId = invoiceId;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      invoiceId,
      amount,
      paymentMethod,
      paymentDate,
      transactionId,
      notes,
      status = 'completed',
    } = body;

    // Validate required fields
    if (!invoiceId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Invoice ID, amount, and payment method are required' },
        { status: 400 }
      );
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get existing payments for this invoice
    const existingPayments = await Payment.find({
      invoiceId,
      status: 'completed',
    });

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = invoice.total - totalPaid;

    if (amount > remaining) {
      return NextResponse.json(
        { error: 'Payment amount exceeds remaining balance' },
        { status: 400 }
      );
    }

    // Generate payment number
    const paymentCount = await Payment.countDocuments();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequence = String(paymentCount + 1).padStart(6, '0');
    const paymentNumber = `PAY-${year}${month}-${sequence}`;

    // Create payment
    const payment = new Payment({
      paymentNumber,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      patientId: invoice.patientId,
      patientName: invoice.patientName,
      amount,
      paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      transactionId,
      notes,
      status,
      createdBy: session.user.email || session.user.id,
    });

    await payment.save();

    // Update invoice status
    const newTotalPaid = totalPaid + amount;
    if (newTotalPaid >= invoice.total) {
      invoice.status = 'paid';
    } else if (newTotalPaid > 0) {
      invoice.status = 'partial';
    } else {
      invoice.status = 'pending';
    }

    await invoice.save();

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}
