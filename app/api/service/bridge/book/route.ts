import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import User from '@/models/User';
import PaystackTransaction from '@/models/PaystackTransaction';
import { getPaystackConfigError, getPaystackSettings } from '@/lib/paystackSettings';
import { toPaystackSubunit } from '@/lib/qwesi-pricing';
import { normalizeCurrency } from '@/lib/practitioner-currency';
import { createBridgeAppointment } from '@/lib/bridgeBooking';
import { ensurePatientByPhone, requireServiceKey, setPasswordUrl, siteUrl } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

/**
 * POST /api/service/bridge/book { phone, name?, doctorId, date, time, reason?, consultationType? }
 *  - free practitioner / active plan  -> appointment is created now        (status: "booked")
 *  - paid practitioner                -> returns a Paystack link; the appointment is created
 *                                        automatically as soon as the payment is confirmed (status: "payment_required")
 */
export async function POST(request: NextRequest) {
  const denied = requireServiceKey(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { phone, name, doctorId, date, time } = body;
    if (!phone || !doctorId || !date || !time) {
      return NextResponse.json({ success: false, error: 'phone, doctorId, date and time are required' }, { status: 400 });
    }
    await dbConnect();
    const { patient } = await ensurePatientByPhone(String(phone), name);
    const booking = {
      doctorId: String(doctorId),
      date: String(date),
      time: String(time),
      reason: String(body.reason || ''),
      consultationType: ['video', 'audio', 'chat'].includes(body.consultationType) ? body.consultationType : 'video',
    };
    const account = {
      patientId: patient.patientId,
      hasPassword: Boolean(patient.password),
      loginUrl: `${siteUrl(request)}/login`,
      setPasswordUrl: patient.password ? null : setPasswordUrl(String(patient._id), request),
    };

    const result = await createBridgeAppointment(patient, booking);
    if (result.ok) return NextResponse.json({ success: true, status: 'booked', ...result, account });
    if (!result.needsPayment) return NextResponse.json({ success: false, error: result.error }, { status: result.status });

    // Payment needed → Paystack link carrying the booking
    if (!mongoose.Types.ObjectId.isValid(booking.doctorId)) return NextResponse.json({ success: false, error: 'Unknown practitioner' }, { status: 400 });
    const doctor = (await User.findById(booking.doctorId).select('name consultationFee currency practitionerType').lean()) as any;
    const fee = Number(doctor?.consultationFee || 0);
    const currency = normalizeCurrency(doctor?.currency);
    const settings = (await Settings.findOne().lean()) as any;
    const paystack = getPaystackSettings(settings);
    const configError = getPaystackConfigError(paystack);
    if (configError) return NextResponse.json({ success: false, error: configError }, { status: 400 });

    const reference = `QWESI-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const itemName = `Consultation with ${doctor.practitionerType === 'herbalist' ? doctor.name : `Dr. ${String(doctor.name).replace(/^dr\.?\s+/i, '')}`}`;
    const metadata = {
      paygId: 'doctor-virtual-consultation',
      serviceName: itemName,
      doctorId: booking.doctorId,
      doctorName: doctor.name,
      booking,
      via: 'bridge',
    };
    const callback_url = `${siteUrl(request)}/pay/return`;
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystack.secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: patient.email,
        amount: toPaystackSubunit(fee),
        currency,
        reference,
        callback_url,
        metadata: { ...metadata, userId: String(patient._id), userRole: 'patient', patientId: patient.patientId, itemType: 'doctor_consultation' },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return NextResponse.json({ success: false, error: data?.message || 'Could not start payment' }, { status: 502 });
    }
    await PaystackTransaction.create({
      reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      userId: String(patient._id),
      userRole: 'patient',
      email: patient.email,
      itemType: 'payg',
      itemId: 'doctor-virtual-consultation',
      itemName,
      amount: fee,
      currency,
      status: 'pending',
      metadata,
    });
    return NextResponse.json({
      success: true,
      status: 'payment_required',
      amount: fee,
      currency,
      practitioner: doctor.name,
      date: booking.date,
      time: booking.time,
      paymentUrl: data.data.authorization_url,
      reference,
      account,
    });
  } catch (e: any) {
    console.error('bridge/book', e);
    return NextResponse.json({ success: false, error: e?.message || 'Booking failed' }, { status: 500 });
  }
}
