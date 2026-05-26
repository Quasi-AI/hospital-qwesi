import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Patient from '@/models/Patient';
import { sendPaymentDueReminder } from '@/lib/notifications/notification-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const search = searchParams.get('search');

    let query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { patientEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ invoices });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
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
      patientId,
      items,
      subtotal,
      tax = 0,
      discount = 0,
      total,
      status = 'draft',
      dueDate,
      notes,
    } = body;

    // Validate required fields
    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Patient ID and at least one item are required' },
        { status: 400 }
      );
    }

    // Calculate totals if not provided
    let calculatedSubtotal = 0;
    if (items && items.length > 0) {
      calculatedSubtotal = items.reduce((sum: number, item: any) => {
        const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);
        return sum + itemTotal;
      }, 0);
    }

    const finalSubtotal = subtotal || calculatedSubtotal;
    const finalTax = tax || 0;
    const finalDiscount = discount || 0;
    const finalTotal = total || (finalSubtotal + finalTax - finalDiscount);

    // Get patient information
    const patient = await Patient.findOne({ patientId: patientId }).lean();
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Update items with calculated totals
    const invoiceItems = items.map((item: any) => ({
      ...item,
      total: (item.quantity || 1) * (item.unitPrice || 0),
    }));

    // Generate invoice number
    const count = await Invoice.countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = String(count + 1).padStart(6, '0');
    const invoiceNumber = `INV-${year}${month}-${sequence}`;

    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      patientId: patient.patientId || patientId,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      items: invoiceItems,
      subtotal: finalSubtotal,
      tax: finalTax,
      discount: finalDiscount,
      total: finalTotal,
      status,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
      createdBy: session.user.email || session.user.id,
    });

    await invoice.save();

    // Send payment due notification for pending or sent invoices
    if (status === 'pending' || status === 'sent') {
      try {
        await sendPaymentDueReminder(invoice._id.toString());
      } catch (notificationError) {
        console.error('Failed to send payment due notification:', notificationError);
        // Don't fail the invoice creation if notification fails
      }
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
