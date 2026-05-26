import mongoose from 'mongoose';

export interface IPatientSubscription {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  planId: string;
  planName: string;
  amount: number;
  currency: 'GHS' | 'USD';
  status: 'active' | 'past_due' | 'cancelled' | 'expired';
  startedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  paystackReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const patientSubscriptionSchema = new mongoose.Schema<IPatientSubscription>(
  {
    patientId: { type: String, required: true, trim: true, index: true },
    patientName: { type: String, required: true, trim: true },
    patientEmail: { type: String, required: true, trim: true, lowercase: true },
    planId: { type: String, required: true, trim: true },
    planName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['GHS', 'USD'], required: true },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    paystackReference: { type: String, trim: true },
  },
  { timestamps: true }
);

patientSubscriptionSchema.index({ patientId: 1, planId: 1, status: 1 });

export default mongoose.models.PatientSubscription ||
  mongoose.model<IPatientSubscription>('PatientSubscription', patientSubscriptionSchema);
