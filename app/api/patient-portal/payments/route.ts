import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Patient from '@/models/Patient';
import PaystackTransaction from '@/models/PaystackTransaction';
import RefundRequest from '@/models/RefundRequest';

export const dynamic = 'force-dynamic';

/**
 * The patient's consultation payments, each with: the appointment it paid for, its refund status,
 * and whether an unfinished checkout can still be resumed ("Pay now").
 * GET            -> { payments: [...] }
 * GET ?reference -> { payment, patient }  (for the printable receipt)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const patient: any = await Patient.findOne({ email: session.user.email }).select('name email phone patientId').lean();
  if (!patient) return NextResponse.json({ payments: [] });

  const reference = request.nextUrl.searchParams.get('reference');
  const filter: Record<string, unknown> = { $or: [{ userId: String(patient._id) }, { email: session.user.email }], itemType: { $in: ['payg', 'invoice'] } };
  if (reference) filter.reference = reference;
  const txs: any[] = await PaystackTransaction.find(filter).sort({ createdAt: -1 }).limit(reference ? 1 : 40).lean();

  const apptIds = txs.map((t) => t.metadata?.consumedByAppointmentId).filter(Boolean);
  const [appts, refunds]: [any[], any[]] = await Promise.all([
    apptIds.length ? Appointment.find({ _id: { $in: apptIds } }).select('doctorName appointmentDate appointmentTime status').lean() : Promise.resolve([]),
    RefundRequest.find({ patientId: String(patient._id) }).select('appointmentId transactionId status refundAmount').lean(),
  ]);
  const apptById = new Map(appts.map((a) => [String(a._id), a]));

  const payments = txs.map((t) => {
    const apptId = t.metadata?.consumedByAppointmentId ? String(t.metadata.consumedByAppointmentId) : '';
    const appt = apptId ? apptById.get(apptId) : null;
    const refund = refunds.find((r) => (apptId && String(r.appointmentId) === apptId) || String(r.transactionId) === String(t._id));
    const ageMs = Date.now() - new Date(t.createdAt).getTime();
    return {
      _id: String(t._id),
      reference: t.reference,
      name: t.itemName,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      createdAt: t.createdAt,
      verifiedAt: t.verifiedAt,
      doctorName: t.metadata?.doctorName || appt?.doctorName || null,
      appointment: appt ? { id: apptId, date: appt.appointmentDate, time: appt.appointmentTime, status: appt.status } : null,
      // paid but the slot has not been booked yet
      paidNotBooked: t.status === 'success' && t.amount > 0 && !apptId && Boolean(t.metadata?.doctorId),
      refund: refund ? { status: refund.status, amount: refund.refundAmount ?? null } : null,
      payUrl: t.status === 'pending' && t.authorizationUrl && ageMs < 24 * 3600_000 ? t.authorizationUrl : null,
    };
  });

  if (reference) {
    if (!payments[0]) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    return NextResponse.json({ payment: payments[0], patient: { name: patient.name, email: patient.email, patientId: patient.patientId } });
  }
  return NextResponse.json({ payments });
}
