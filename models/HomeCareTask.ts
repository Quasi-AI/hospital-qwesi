import mongoose, { Schema, Document } from 'mongoose';

export interface IHomeCareTask extends Document {
  patientId: string;
  patientName: string;
  patientEmail: string;
  title: string;
  category: 'nursing' | 'medication' | 'wound-care' | 'therapy' | 'follow-up' | 'other';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  dueAt?: Date;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HomeCareTaskSchema = new Schema<IHomeCareTask>(
  {
    patientId: { type: String, required: true, trim: true, index: true },
    patientName: { type: String, required: true, trim: true },
    patientEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['nursing', 'medication', 'wound-care', 'therapy', 'follow-up', 'other'],
      default: 'follow-up',
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    dueAt: { type: Date },
    assignedTo: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

HomeCareTaskSchema.index({ patientId: 1, status: 1, dueAt: 1 });

export default mongoose.models.HomeCareTask ||
  mongoose.model<IHomeCareTask>('HomeCareTask', HomeCareTaskSchema);
