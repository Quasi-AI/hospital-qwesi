import mongoose from 'mongoose';
import Appointment from '@/models/Appointment';
import TelemedicineSession from '@/models/TelemedicineSession';
import User from '@/models/User';
import { normalizeAppointmentDateForStorage, normalizeTimeLabel, isSlotAvailableForDoctor } from '@/lib/appointmentSlotting';
import { getSystemCurrency } from '@/lib/getSystemCurrency';
import { createNotification, scheduleAppointmentReminder } from '@/lib/notifications/notification-service';
import { consumePatientPaygCredit, getPatientConsultationAccess } from '@/lib/patientConsultationAccess';

export type BookingRequest = {
  doctorId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason: string;
  consultationType?: 'video' | 'audio' | 'chat';
};

export type BookingResult =
  | { ok: true; appointmentId: string; sessionId?: string; doctorName: string; date: string; time: string }
  | { ok: false; status: number; error: string; needsPayment?: boolean };

/**
 * Creates the virtual appointment for a patient once consultation access is cleared
 * (free practitioner, active subscription or a paid, unused consultation credit).
 */
export async function createBridgeAppointment(patient: any, req: BookingRequest): Promise<BookingResult> {
  if (!mongoose.Types.ObjectId.isValid(req.doctorId)) return { ok: false, status: 400, error: 'Unknown practitioner' };
  const doctor = (await User.findOne({ _id: req.doctorId, role: 'doctor', approvalStatus: { $ne: 'rejected' } })
    .select('name email phone specialization practitionerType')
    .lean()) as any;
  if (!doctor) return { ok: false, status: 404, error: 'Practitioner not found' };

  const time = normalizeTimeLabel(req.time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.date) || !time) return { ok: false, status: 400, error: 'Pick a valid date and time' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${req.date}T00:00:00.000Z`) < today) return { ok: false, status: 400, error: 'That date is in the past' };
  if (!(await isSlotAvailableForDoctor(req.doctorId, req.date, time))) {
    return { ok: false, status: 409, error: 'That time slot is no longer available' };
  }

  const access = await getPatientConsultationAccess({
    patientEmail: patient.email,
    patientMongoId: String(patient._id),
    doctorId: req.doctorId,
  });
  if (!access.allowed) return { ok: false, status: 402, error: access.message || 'Payment required', needsPayment: true };

  const reason = String(req.reason || '').trim().slice(0, 4000) || 'Consultation booked via WhatsApp/Facebook';
  const title = doctor.practitionerType === 'herbalist' ? '' : 'Dr. ';
  const appointment = await Appointment.create({
    patientId: String(patient._id),
    patientName: patient.name,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    doctorId: doctor._id,
    doctorName: doctor.name,
    doctorEmail: doctor.email,
    source: 'patient_portal',
    appointmentDate: normalizeAppointmentDateForStorage(req.date),
    appointmentTime: time,
    appointmentType: 'telemedicine',
    status: 'scheduled',
    location: 'Online consultation',
    reason,
    notes: `Booked by the Qwesi AI assistant. Billing cover: ${access.source}`,
  });

  const start = new Date(`${req.date}T${time}`);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const dayCount = await TelemedicineSession.countDocuments({
    createdAt: { $gte: new Date(start.getFullYear(), start.getMonth(), start.getDate()), $lt: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) },
  });
  const session = await TelemedicineSession.create({
    sessionNumber: `TM-${req.date.replace(/-/g, '')}-${String(dayCount + 1).padStart(4, '0')}-${Date.now().toString(36)}`,
    roomId: `room-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    appointmentId: appointment._id,
    patientId: patient._id,
    doctorId: doctor._id,
    consultationType: req.consultationType || 'video',
    scheduledStartTime: start,
    scheduledEndTime: end,
    status: 'scheduled',
    chiefComplaint: reason,
    consultationFee: access.source === 'payg' ? access.paygTransaction?.amount || 0 : 0,
    currency: access.source === 'payg' ? access.paygTransaction?.currency || (await getSystemCurrency()) : await getSystemCurrency(),
    paymentStatus: access.source === 'payg' ? 'paid' : 'waived',
    recordingEnabled: false,
    participants: [
      { odId: patient._id, odType: 'patient', name: patient.name, connectionStatus: 'waiting' },
      { odId: doctor._id, odType: 'doctor', name: doctor.name, connectionStatus: 'waiting' },
    ],
    chatMessages: [],
    createdBy: patient._id,
  });
  await Appointment.findByIdAndUpdate(appointment._id, { telemedicineSessionId: session._id });

  if (access.source === 'payg' && access.paygTransaction) {
    await consumePatientPaygCredit({
      transactionId: access.paygTransaction._id,
      appointmentId: String(appointment._id),
      telemedicineSessionId: String(session._id),
    });
  }

  try { await scheduleAppointmentReminder(String(appointment._id)); } catch (e) { console.error('reminder', e); }
  await createNotification({
    type: 'telemedicine',
    recipientId: String(doctor._id),
    recipientType: 'user',
    recipientEmail: doctor.email,
    recipientPhone: doctor.phone,
    title: 'New patient video consultation',
    message: `${patient.name} booked ${req.date} at ${time}.`,
    relatedEntity: { type: 'telemedicineSession', id: String(session._id) },
    metadata: { appointmentId: String(appointment._id), telemedicineSessionId: String(session._id), billingCover: access.source },
  }).catch((e: unknown) => console.error('notify doctor', e));

  return { ok: true, appointmentId: String(appointment._id), sessionId: String(session._id), doctorName: `${title}${doctor.name}`, date: req.date, time };
}
