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
  capacity?: {
    emergencyStatus?: 'accepting' | 'limited' | 'full';
    emergencyBedsAvailable?: number;
    icuBedsAvailable?: number;
    oxygenAvailable?: boolean;
    maternityStatus?: 'accepting' | 'limited' | 'full' | 'not-offered';
    traumaStatus?: 'accepting' | 'limited' | 'full' | 'not-offered';
    notes?: string;
    updatedAt?: Date;
    updatedBy?: string;
  };
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
    // Live capacity/status self-reported by the hospital (or its admin),
    // consumed by the network dashboard and by the AI assistant to decide
    // where to recommend patients go.
    capacity: {
      emergencyStatus: { type: String, enum: ['accepting', 'limited', 'full'], default: undefined },
      emergencyBedsAvailable: { type: Number },
      icuBedsAvailable: { type: Number },
      oxygenAvailable: { type: Boolean },
      maternityStatus: { type: String, enum: ['accepting', 'limited', 'full', 'not-offered'], default: undefined },
      traumaStatus: { type: String, enum: ['accepting', 'limited', 'full', 'not-offered'], default: undefined },
      notes: { type: String, trim: true },
      updatedAt: { type: Date },
      updatedBy: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

HospitalSchema.index({ name: 'text', region: 'text', city: 'text' });
HospitalSchema.index({ type: 1, isActive: 1 });
HospitalSchema.index({ userId: 1 });
HospitalSchema.index({ loginEmail: 1 });

const Hospital = mongoose.models.Hospital || mongoose.model<IHospital>('Hospital', HospitalSchema);

export default Hospital;
