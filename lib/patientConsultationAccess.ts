import mongoose from 'mongoose';
import Appointment from '@/models/Appointment';
import PatientSubscription from '@/models/PatientSubscription';
import PaystackTransaction from '@/models/PaystackTransaction';
import TelemedicineSession from '@/models/TelemedicineSession';

export const DOCTOR_CONSULTATION_PAYG_IDS = [
  'doctor-virtual-consultation',
  'specialist-consultation',
] as const;

export type PatientConsultationAccessSource =
  | 'free'
  | 'subscription'
  | 'payg'
  | 'payment_required';

export type PatientConsultationAccess = {
  allowed: boolean;
  source: PatientConsultationAccessSource;
  previousConsultationCount: number;
  freeConsultationsRemaining: number;
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
  message: string;
};

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function unconsumedPaygQuery(email: string) {
  return {
    email,
    itemType: 'payg',
    itemId: { $in: [...DOCTOR_CONSULTATION_PAYG_IDS] },
    status: 'success',
    $or: [{ 'metadata.consumedAt': { $exists: false } }, { 'metadata.consumedAt': null }],
  };
}

export async function getPatientConsultationAccess(params: {
  patientEmail: string;
  patientMongoId?: string;
}): Promise<PatientConsultationAccess> {
  const email = normalizeEmail(params.patientEmail);
  const now = new Date();

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
      PaystackTransaction.findOne(unconsumedPaygQuery(email)).sort({ createdAt: 1 }).lean(),
    ]);

  const previousConsultationCount = appointmentCount + standaloneSessionCount;
  const freeConsultationsRemaining = previousConsultationCount === 0 ? 1 : 0;

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
      freeConsultationsRemaining,
      hasActiveSubscription: true,
      activeSubscription: {
        _id: sub._id.toString(),
        planId: sub.planId,
        planName: sub.planName,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      message: `Covered by active ${sub.planName} subscription.`,
    };
  }

  if (freeConsultationsRemaining > 0) {
    return {
      allowed: true,
      source: 'free',
      previousConsultationCount,
      freeConsultationsRemaining,
      hasActiveSubscription: false,
      message: 'Your first doctor consultation is free.',
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
      freeConsultationsRemaining,
      hasActiveSubscription: false,
      paygTransaction: {
        _id: tx._id.toString(),
        reference: tx.reference,
        itemId: tx.itemId,
        itemName: tx.itemName,
        amount: tx.amount,
        currency: tx.currency,
      },
      message: `Covered by PAYG payment ${tx.reference}.`,
    };
  }

  return {
    allowed: false,
    source: 'payment_required',
    previousConsultationCount,
    freeConsultationsRemaining,
    hasActiveSubscription: false,
    message: 'Please pay as you go or subscribe before booking another doctor consultation.',
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
