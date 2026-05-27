import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import Patient from '@/models/Patient';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import PatientSubscription from '@/models/PatientSubscription';
import PaystackTransaction from '@/models/PaystackTransaction';
import { getPaystackConfigError, getPaystackSettings } from '@/lib/paystackSettings';
import { getQwesiSubscriptionPlan, toPaystackSubunit } from '@/lib/qwesi-pricing';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reference = request.nextUrl.searchParams.get('reference') || '';
    if (!reference) {
      return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 });
    }

    await dbConnect();
    const settings = await Settings.findOne().lean() as any;
    const paystack = getPaystackSettings(settings);
    const configError = getPaystackConfigError(paystack);
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 400 });
    }

    const transaction = await PaystackTransaction.findOne({ reference });
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.email !== session.user.email && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystack.secretKey}` },
    });
    const data = await response.json();
    if (!response.ok || !data?.status) {
      return NextResponse.json({ error: data?.message || 'Paystack verification failed' }, { status: 502 });
    }

    const paystackData = data.data;
    const expectedAmount = toPaystackSubunit(transaction.amount);
    const amountMatches = Number(paystackData.amount) === expectedAmount;
    const currencyMatches = paystackData.currency === transaction.currency;
    const isSuccess = paystackData.status === 'success' && amountMatches && currencyMatches;

    transaction.paystackStatus = paystackData.status;
    transaction.paystackTransactionId = String(paystackData.id || '');
    transaction.status = isSuccess ? 'success' : 'failed';
    transaction.verifiedAt = new Date();
    await transaction.save();

    if (!isSuccess) {
      return NextResponse.json({
        status: transaction.status,
        error: 'Payment was not successful or did not match the expected amount/currency',
      }, { status: 400 });
    }

    if (transaction.itemType === 'subscription') {
      const plan = getQwesiSubscriptionPlan(transaction.itemId);
      if (plan) {
        const patient = await Patient.findOne({ email: transaction.email });
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await PatientSubscription.findOneAndUpdate(
          {
            patientId: patient?.patientId || patient?._id?.toString() || transaction.userId,
            planId: plan.id,
            status: 'active',
          },
          {
            $set: {
              patientId: patient?.patientId || patient?._id?.toString() || transaction.userId,
              patientName: patient?.name || session.user.name || transaction.email,
              patientEmail: transaction.email,
              planId: plan.id,
              planName: plan.name,
              amount: transaction.amount,
              currency: transaction.currency,
              status: 'active',
              startedAt: now,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              paystackReference: reference,
            },
          },
          { upsert: true, returnDocument: 'after' }
        );
      }
    }

    if (transaction.itemType === 'invoice') {
      const invoice = await Invoice.findById(transaction.itemId);
      if (invoice && invoice.status !== 'paid') {
        const paymentCount = await Payment.countDocuments();
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const sequence = String(paymentCount + 1).padStart(6, '0');

        await Payment.create({
          paymentNumber: `PAY-${year}${month}-${sequence}`,
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          patientId: invoice.patientId,
          patientName: invoice.patientName,
          amount: transaction.amount,
          paymentMethod: 'card',
          paymentDate: new Date(),
          status: 'completed',
          notes: `Paystack reference: ${reference}`,
          createdBy: session.user.id || 'paystack',
        });
        invoice.status = 'paid';
        await invoice.save();
      }
    }

    return NextResponse.json({
      status: 'success',
      reference,
      itemType: transaction.itemType,
      itemName: transaction.itemName,
      amount: transaction.amount,
      currency: transaction.currency,
    });
  } catch (error: any) {
    console.error('Paystack verify error:', error);
    return NextResponse.json({ error: error.message || 'Payment verification failed' }, { status: 500 });
  }
}
