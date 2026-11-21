import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import Patient from '@/models/Patient';
import PaystackTransaction from '@/models/PaystackTransaction';
import { getPaystackConfigError, getPaystackSettings } from '@/lib/paystackSettings';
import { toPaystackSubunit } from '@/lib/qwesi-pricing';
import { createBridgeAppointment } from '@/lib/bridgeBooking';
import { setPasswordUrl } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

/**
 * Public return step for payments started from WhatsApp/Facebook (no login needed).
 * The Paystack reference is verified with Paystack itself, then the pending booking is created.
 */
export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get('reference') || request.nextUrl.searchParams.get('trxref') || '';
    if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    await dbConnect();
    const tx = await PaystackTransaction.findOne({ reference });
    if (!tx || (tx.metadata as any)?.via !== 'bridge') return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const paystack = getPaystackSettings((await Settings.findOne().lean()) as any);
    const configError = getPaystackConfigError(paystack);
    if (configError) return NextResponse.json({ error: configError }, { status: 400 });

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystack.secretKey}` },
    });
    const data = await res.json();
    if (!res.ok || !data?.status) return NextResponse.json({ error: 'Could not verify payment' }, { status: 502 });
    const p = data.data;
    const ok = p.status === 'success' && Number(p.amount) === toPaystackSubunit(tx.amount) && p.currency === tx.currency;
    tx.paystackStatus = p.status;
    tx.paystackTransactionId = String(p.id || '');
    tx.status = ok ? 'success' : 'failed';
    tx.verifiedAt = new Date();
    await tx.save();
    if (!ok) return NextResponse.json({ status: 'failed', error: 'Payment was not successful' }, { status: 400 });

    const patient = await Patient.findById(tx.userId);
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    const meta: any = tx.metadata || {};
    if (meta.consumedByAppointmentId) {
      return NextResponse.json({ status: 'booked', appointmentId: meta.consumedByAppointmentId, practitioner: meta.doctorName, date: meta.booking?.date, time: meta.booking?.time, setPasswordUrl: patient.password ? null : setPasswordUrl(String(patient._id), request) });
    }
    const result = await createBridgeAppointment(patient, meta.booking);
    if (!result.ok) {
      // Paid but the slot was taken in the meantime – keep the credit so they can pick another time.
      return NextResponse.json({ status: 'paid_slot_unavailable', error: result.error, practitioner: meta.doctorName, setPasswordUrl: patient.password ? null : setPasswordUrl(String(patient._id), request) });
    }
    return NextResponse.json({
      status: 'booked',
      appointmentId: result.appointmentId,
      practitioner: result.doctorName,
      date: result.date,
      time: result.time,
      setPasswordUrl: patient.password ? null : setPasswordUrl(String(patient._id), request),
    });
  } catch (e) {
    console.error('payment/confirm', e);
    return NextResponse.json({ error: 'Could not confirm payment' }, { status: 500 });
  }
}
