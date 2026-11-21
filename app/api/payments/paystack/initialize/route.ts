import { normalizeCurrency } from '@/lib/practitioner-currency';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import Patient from '@/models/Patient';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import mongoose from 'mongoose';
import PaystackTransaction from '@/models/PaystackTransaction';
import { getPaystackConfigError, getPaystackSettings } from '@/lib/paystackSettings';
import {
  getQwesiPaygItem,
  getQwesiSubscriptionPlan,
  toPaystackSubunit,
} from '@/lib/qwesi-pricing';

function callbackUrlFromRequest(request: NextRequest, configuredUrl?: string) {
  if (configuredUrl) return configuredUrl;
  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  return `${baseUrl.replace(/\/$/, '')}/patient-portal/subscriptions`;
}

function callbackUrlWithPath(request: NextRequest, callbackPath?: unknown, configuredUrl?: string) {
  const path = String(callbackPath || '').trim();
  if (path.startsWith('/') && !path.startsWith('//')) {
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }
  return callbackUrlFromRequest(request, configuredUrl);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const itemType = String(body.itemType || '');
    const itemId = String(body.itemId || '');
    const selectedAmount = Number(body.amount);

    await dbConnect();
    const settings = await Settings.findOne().lean() as any;
    const paystack = getPaystackSettings(settings);

    const configError = getPaystackConfigError(paystack);
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 400 });
    }

    let itemName = '';
    let amount = 0;
    let currency: 'GHS' | 'USD' | 'NGN' | 'KES' | 'ZAR' = 'GHS';
    let metadata: Record<string, unknown> = {};
    let storedItemType: 'subscription' | 'payg' | 'invoice' | null = null;
    let storedItemId: string | null = null;

    if (itemType === 'doctor_consultation') {
      // Patient pays the doctor's own consultation fee to book
      if (session.user.role !== 'patient') {
        return NextResponse.json({ error: 'Only patients can book consultations' }, { status: 403 });
      }
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return NextResponse.json({ error: 'Unknown doctor' }, { status: 400 });
      }
      const doctor = (await User.findOne({ _id: itemId, role: 'doctor', approvalStatus: { $ne: 'rejected' } })
        .select('name consultationFee currency practitionerType')
        .lean()) as { name: string; consultationFee?: number; currency?: string; practitionerType?: string } | null;
      if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      const fee = Number(doctor.consultationFee || 0);
      if (fee <= 0) {
        return NextResponse.json({ error: 'This doctor offers free consultations - no payment needed' }, { status: 400 });
      }
      itemName = `Consultation with ${doctor.practitionerType === 'herbalist' ? '' : 'Dr. '}${doctor.name}`;
      amount = fee;
      currency = normalizeCurrency(doctor.currency);
      storedItemType = 'payg';
      storedItemId = 'doctor-virtual-consultation';
      metadata = { paygId: 'doctor-virtual-consultation', serviceName: itemName, doctorId: itemId, doctorName: doctor.name };
    } else if (itemType === 'subscription') {
      const plan = getQwesiSubscriptionPlan(itemId);
      if (!plan) return NextResponse.json({ error: 'Unknown subscription plan' }, { status: 400 });
      itemName = plan.name;
      amount = plan.amount;
      currency = plan.currency;
      metadata = { planId: plan.id, planName: plan.name };
    } else if (itemType === 'payg') {
      const item = getQwesiPaygItem(itemId);
      if (!item) return NextResponse.json({ error: 'Unknown PAYG service' }, { status: 400 });
      if (item.maxAmount === 0) {
        return NextResponse.json({ error: 'This PAYG service is free' }, { status: 400 });
      }
      amount = Number.isFinite(selectedAmount) && selectedAmount > 0 ? selectedAmount : item.minAmount;
      if (amount < item.minAmount || amount > item.maxAmount) {
        return NextResponse.json({ error: `Amount must be between ${item.minAmount} and ${item.maxAmount}` }, { status: 400 });
      }
      itemName = item.name;
      currency = item.currency;
      metadata = { paygId: item.id, serviceName: item.name };
    } else if (itemType === 'invoice') {
      const invoice = await Invoice.findById(itemId).lean() as any;
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      itemName = invoice.invoiceNumber;
      amount = Number(invoice.total || 0);
      currency = 'GHS';
      metadata = { invoiceId: String(invoice._id), invoiceNumber: invoice.invoiceNumber };
    } else {
      return NextResponse.json({ error: 'Unsupported payment item type' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero' }, { status: 400 });
    }

    const patient = await Patient.findOne({ email: session.user.email }).lean() as any;
    const reference = `QWESI-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const callback_url = callbackUrlWithPath(request, body.callbackPath, paystack.callbackUrl);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystack.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        amount: toPaystackSubunit(amount),
        currency,
        reference,
        callback_url,
        metadata: {
          ...metadata,
          userId: session.user.id,
          userRole: session.user.role,
          patientId: patient?.patientId || patient?._id?.toString() || session.user.id,
          itemType,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.status) {
      return NextResponse.json(
        { error: data?.message || 'Failed to initialize Paystack transaction' },
        { status: 502 }
      );
    }

    await PaystackTransaction.create({
      reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      userId: session.user.id,
      userRole: session.user.role,
      email: session.user.email,
      itemType: storedItemType || itemType,
      itemId: storedItemId || itemId,
      itemName,
      amount,
      currency,
      status: 'pending',
      metadata,
    });

    return NextResponse.json({
      reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
    });
  } catch (error: any) {
    console.error('Paystack initialize error:', error);
    return NextResponse.json({ error: error.message || 'Payment initialization failed' }, { status: 500 });
  }
}
