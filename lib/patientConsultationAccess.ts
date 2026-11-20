import mongoose from 'mongoose';
import Appointment from '@/models/Appointment';
import PatientSubscription from '@/models/PatientSubscription';
import PaystackTransaction from '@/models/PaystackTransaction';
import TelemedicineSession from '@/models/TelemedicineSession';
import User from '@/models/User';

export const DOCTOR_CONSULTATION_PAYG_IDS = [
  'doctor-virtual-consultation',
  'specialist-consultation',
] as const;

export type PatientConsultationAccessSource =
  | 'subscription'
  | 'payg'
  | 'free'
  | 'payment_required';

export type PatientConsultationAccess = {
  allowed: boolean;
  source: PatientConsultationAccessSource;
  previousConsultationCount: number;
  hasActiveSubscription: boolean;
  activeSubscription?: {
    _id: string;
    planId: string;
    planName: string;
    currentPeriodEnd: Date;
  };
  paygTransaction?: {
    _id: string;
    reference: string;
    itemId: string;
    itemName: string;
    amount: number;
    currency: 'GHS' | 'USD';
  };
  /** Set when a specific doctor was requested: that doctor's fee in GHS */
  doctor?: { id: string; name: string; consultationFee: number; currency: 'GHS' };
  /** Amount the patient still has to pay to book (0 when already covered) */
  amountDue?: number;
  message: string;
};

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function unconsumedPaygQuery(email: string, doctorId?: string) {
  return {
    email,
    itemType: 'payg',
    itemId: { $in: [...DOCTOR_CONSULTATION_PAYG_IDS] },
    status: 'success',
    // A paid booking credit is tied to the doctor that was paid
    ...(doctorId ? { 'metadata.doctorId': doctorId } : {}),
    $or: [{ 'metadata.consumedAt': { $exists: false } }, { 'metadata.consumedAt': null }],
  };
}

export async function getPatientConsultationAccess(params: {
  patientEmail: string;
  patientMongoId?: string;
  /** When set, access is evaluated for this specific doctor (fee + doctor-specific credit) */
  doctorId?: string;
}): Promise<PatientConsultationAccess> {
  const email = normalizeEmail(params.patientEmail);
  const now = new Date();

  const requestedDoctor =
    params.doctorId && mongoose.Types.ObjectId.isValid(params.doctorId)
      ? ((await User.findOne({ _id: params.doctorId, role: 'doctor' })
          .select('name consultationFee')
          .lean()) as { _id: { toString: () => string }; name: string; consultationFee?: number } | null)
      : null;
  const doctorInfo = requestedDoctor
    ? {
        id: requestedDoctor._id.toString(),
        name: requestedDoctor.name,
        consultationFee: Number(requestedDoctor.consultationFee || 0),
        currency: 'GHS' as const,
      }
    : undefined;

  const appointmentQuery: Record<string, unknown> = {
    patientEmail: email,
    doctorId: { $exists: true, $ne: null },
    status: { $nin: ['cancelled'] },
    appointmentType: { $in: ['consultation', 'telemedicine', 'follow-up', 'followUp', 'checkup'] },
  };

  const patientObjectId =
    params.patientMongoId && mongoose.Types.ObjectId.isValid(params.patientMongoId)
      ? new mongoose.Types.ObjectId(params.patientMongoId)
      : null;

  const [appointmentCount, standaloneSessionCount, activeSubscription, paygTransaction] =
    await Promise.all([
      Appointment.countDocuments(appointmentQuery),
      patientObjectId
        ? TelemedicineSession.countDocuments({
            patientId: patientObjectId,
            appointmentId: { $exists: false },
            status: { $nin: ['cancelled', 'no-show', 'technical-issue'] },
          })
        : Promise.resolve(0),
      PatientSubscription.findOne({
        patientEmail: email,
        status: 'active',
        currentPeriodEnd: { $gte: now },
      })
        .sort({ currentPeriodEnd: -1 })
        .lean(),
      PaystackTransaction.findOne(unconsumedPaygQuery(email, doctorInfo?.id)).sort({ createdAt: 1 }).lean(),
    ]);

  const previousConsultationCount = appointmentCount + standaloneSessionCount;

  if (activeSubscription) {
    const sub = activeSubscription as {
      _id: { toString: () => string };
      planId: string;
      planName: string;
      currentPeriodEnd: Date;
    };
    return {
      allowed: true,
      source: 'subscription',
      previousConsultationCount,
      hasActiveSubscription: true,
      activeSubscription: {
        _id: sub._id.toString(),
        planId: sub.planId,
        planName: sub.planName,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      doctor: doctorInfo,
      amountDue: 0,
      message: `Covered by active ${sub.planName} subscription.`,
    };
  }

  if (paygTransaction) {
    const tx = paygTransaction as {
      _id: { toString: () => string };
      reference: string;
      itemId: string;
      itemName: string;
      amount: number;
      currency: 'GHS' | 'USD';
    };
    return {
      allowed: true,
      source: 'payg',
      previousConsultationCount,
      hasActiveSubscription: false,
      paygTransaction: {
        _id: tx._id.toString(),
        reference: tx.reference,
        itemId: tx.itemId,
        itemName: tx.itemName,
        amount: tx.amount,
        currency: tx.currency,
      },
      doctor: doctorInfo,
      amountDue: 0,
      message: `Payment received (${tx.reference}). Pick a time to confirm your booking.`,
    };
  }

  if (doctorInfo && doctorInfo.consultationFee <= 0) {
    return {
      allowed: true,
      source: 'free',
      previousConsultationCount,
      hasActiveSubscription: false,
      doctor: doctorInfo,
      amountDue: 0,
      message: `Dr. ${doctorInfo.name} offers free consultations.`,
    };
  }

  return {
    allowed: false,
    source: 'payment_required',
    previousConsultationCount,
    hasActiveSubscription: false,
    doctor: doctorInfo,
    amountDue: doctorInfo?.consultationFee,
    message: doctorInfo
      ? `Pay Dr. ${doctorInfo.name}'s consultation fee of GHS ${doctorInfo.consultationFee} to confirm your booking.`
      : 'Choose a doctor to see the consultation fee, or subscribe for included consultations.',
  };
}

export async function consumePatientPaygCredit(params: {
  transactionId: string;
  appointmentId: string;
  telemedicineSessionId?: string;
}) {
  if (!mongoose.Types.ObjectId.isValid(params.transactionId)) return;

  await PaystackTransaction.findByIdAndUpdate(params.transactionId, {
    $set: {
      'metadata.consumedAt': new Date(),
      'metadata.consumedByAppointmentId': params.appointmentId,
      ...(params.telemedicineSessionId
        ? { 'metadata.consumedByTelemedicineSessionId': params.telemedicineSessionId }
        : {}),
    },
  });
}
