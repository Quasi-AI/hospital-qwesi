import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Patient from '@/models/Patient';
import PaystackTransaction from '@/models/PaystackTransaction';
import RefundRequest, { REFUND_REASONS } from '@/models/RefundRequest';
import TelemedicineSession from '@/models/TelemedicineSession';
import { getFinanceSettings, processRefund, setEarningDisputed } from '@/lib/finance';

async function currentPatient() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.role !== 'patient') return null;
  await dbConnect();
  return Patient.findOne({ email: session.user.email });
}

export async function GET() {
  const patient = await currentPatient();
  if (!patient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [refunds, paid] = await Promise.all([
    RefundRequest.find({ patientId: String(patient._id) }).sort({ createdAt: -1 }).lean(),
    // Appointments this patient paid for (candidates for a refund request)
    PaystackTransaction.find({ userId: String(patient._id), status: 'success', itemType: 'payg', 'metadata.consumedByAppointmentId': { $exists: true } })
      .select('amount currency reference metadata createdAt').sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  const appointmentIds = paid.map((t: any) => t.metadata.consumedByAppointmentId);
  const appts = await Appointment.find({ _id: { $in: appointmentIds } }).select('doctorName appointmentDate appointmentTime status').lean();
  const byId = new Map(appts.map((a: any) => [String(a._id), a]));
  const taken = new Set(refunds.map((r: any) => String(r.appointmentId)));
  const eligible = paid
    .map((t: any) => ({ appointmentId: t.metadata.consumedByAppointmentId, amount: t.amount, currency: t.currency, appointment: byId.get(String(t.metadata.consumedByAppointmentId)) }))
    .filter((x) => x.appointment && !taken.has(String(x.appointmentId)));
  return NextResponse.json({ refunds, eligible });
}

export async function POST(request: NextRequest) {
  try {
    const patient = await currentPatient();
    if (!patient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const appointmentId = String(body.appointmentId || '');
    const reason = String(body.reason || '');
    const details = String(body.details || '').trim().slice(0, 2000);
    if (!(REFUND_REASONS as readonly string[]).includes(reason)) return NextResponse.json({ error: 'Choose a reason' }, { status: 400 });
    if (reason !== 'practitioner_no_show' && details.length < 15) {
      return NextResponse.json({ error: 'Please tell us what happened (at least a sentence).' }, { status: 400 });
    }

    const settings = await getFinanceSettings();
    const appt = (await Appointment.findOne({ _id: appointmentId, patientId: String(patient._id) }).lean().catch(() => null)) as any;
    if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    if (await RefundRequest.exists({ appointmentId })) return NextResponse.json({ error: 'A refund request already exists for this appointment' }, { status: 409 });

    const tx = (await PaystackTransaction.findOne({ userId: String(patient._id), status: 'success', 'metadata.consumedByAppointmentId': appointmentId }).lean()) as any;
    if (!tx || !(tx.amount > 0)) return NextResponse.json({ error: 'This consultation was not paid for, so there is nothing to refund' }, { status: 400 });

    const session = (await TelemedicineSession.findOne({ appointmentId }).lean()) as any;
    const scheduledStart = session?.scheduledStartTime ? new Date(session.scheduledStartTime) : new Date(appt.appointmentDate);
    const windowEnd = scheduledStart.getTime() + settings.refundWindowDays * 86400_000;
    if (Date.now() > windowEnd) return NextResponse.json({ error: `Refund requests must be made within ${settings.refundWindowDays} days of the appointment` }, { status: 400 });

    const patientP = session?.participants?.find((p: any) => p.odType === 'patient');
    const doctorP = session?.participants?.find((p: any) => p.odType === 'doctor');
    const evidence = {
      scheduledStart,
      patientJoinedAt: patientP?.joinedAt,
      practitionerJoinedAt: doctorP?.joinedAt,
      sessionStatus: session?.status,
      durationMinutes: session?.actualStartTime && session?.actualEndTime ? Math.round((new Date(session.actualEndTime).getTime() - new Date(session.actualStartTime).getTime()) / 60000) : 0,
      chatMessages: session?.chatMessages?.length || 0,
    };

    const recent = await RefundRequest.countDocuments({ patientId: String(patient._id), createdAt: { $gte: new Date(Date.now() - 30 * 86400_000) } });
    const refund = await RefundRequest.create({
      patientId: String(patient._id), patientName: patient.name, patientEmail: patient.email,
      appointmentId, sessionId: session ? String(session._id) : undefined,
      doctorId: String(appt.doctorId), doctorName: appt.doctorName,
      transactionId: String(tx._id), reference: tx.reference, currency: tx.currency, amountPaid: tx.amount,
      reason, details, evidence, flagged: recent >= 3,
    });
    // Freeze the practitioner's earning while this is open
    await setEarningDisputed(appointmentId, true);

    // Clear-cut no-show: the patient was in the room, the practitioner never joined, grace period over.
    const graceOver = Date.now() > scheduledStart.getTime() + settings.noShowGraceMinutes * 60_000;
    const clearNoShow = reason === 'practitioner_no_show' && graceOver && evidence.patientJoinedAt && !evidence.practitionerJoinedAt && evidence.sessionStatus !== 'completed' && !refund.flagged;
    if (clearNoShow) {
      const done = await processRefund(String(refund._id), { auto: true, note: 'Auto-approved: patient waited in the room, practitioner never joined.' });
      return NextResponse.json({ refund: done, autoApproved: true }, { status: 201 });
    }
    return NextResponse.json({ refund, autoApproved: false }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000) return NextResponse.json({ error: 'A refund request already exists for this appointment' }, { status: 409 });
    console.error('refund request', e);
    return NextResponse.json({ error: 'Could not submit refund request' }, { status: 500 });
  }
}
