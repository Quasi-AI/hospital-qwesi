import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  code: string;
  type: 'virtual' | 'local' | 'partner';
  region?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  ownership?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
  userId?: mongoose.Types.ObjectId;
  loginEmail?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, unique: true },
    type: {
      type: String,
      enum: ['virtual', 'local', 'partner'],
      default: 'local',
    },
    region: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    notes: { type: String },
    ownership: { type: String, trim: true },
    district: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    source: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    loginEmail: { type: String, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String },
  },
  { timestamps: true }
);

HospitalSchema.index({ name: 'text', region: 'text', city: 'text' });
HospitalSchema.index({ type: 1, isActive: 1 });
HospitalSchema.index({ userId: 1 });
HospitalSchema.index({ loginEmail: 1 });

const Hospital = mongoose.models.Hospital || mongoose.model<IHospital>('Hospital', HospitalSchema);

export default Hospital;
