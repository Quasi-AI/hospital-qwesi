import mongoose, { Schema, Document } from 'mongoose';

export interface IPatientReferral extends Document {
  patientId: string;
  patientName: string;
  patientEmail: string;
  referralType: 'specialist' | 'hospital' | 'diagnostic' | 'home-care' | 'other';
  title: string;
  referredTo: string;
  referredBy?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'critical';
  notes?: string;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PatientReferralSchema = new Schema<IPatientReferral>(
  {
    patientId: { type: String, required: true, trim: true, index: true },
    patientName: { type: String, required: true, trim: true },
    patientEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    referralType: {
      type: String,
      enum: ['specialist', 'hospital', 'diagnostic', 'home-care', 'other'],
      default: 'specialist',
    },
    title: { type: String, required: true, trim: true },
    referredTo: { type: String, required: true, trim: true },
    referredBy: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'critical'],
      default: 'routine',
    },
    notes: { type: String, trim: true },
    scheduledAt: { type: Date },
  },
  { timestamps: true }
);

PatientReferralSchema.index({ patientId: 1, status: 1, createdAt: -1 });

export default mongoose.models.PatientReferral ||
  mongoose.model<IPatientReferral>('PatientReferral', PatientReferralSchema);
