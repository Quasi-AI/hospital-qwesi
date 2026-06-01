import mongoose, { Schema, Document } from 'mongoose';

export interface IPatientFamilyMember extends Document {
  ownerPatientId: string;
  ownerPatientEmail: string;
  name: string;
  relationship: string;
  dateOfBirth?: Date;
  phone?: string;
  email?: string;
  accessStatus: 'pending' | 'active' | 'disabled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientFamilyMemberSchema = new Schema<IPatientFamilyMember>(
  {
    ownerPatientId: { type: String, required: true, trim: true, index: true },
    ownerPatientEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    accessStatus: {
      type: String,
      enum: ['pending', 'active', 'disabled'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

PatientFamilyMemberSchema.index({ ownerPatientId: 1, name: 1 });

export default mongoose.models.PatientFamilyMember ||
  mongoose.model<IPatientFamilyMember>('PatientFamilyMember', PatientFamilyMemberSchema);
