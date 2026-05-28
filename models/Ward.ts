import mongoose, { Schema, Document } from 'mongoose';

export interface IWard extends Document {
  wardNumber: string;
  hospitalId?: mongoose.Schema.Types.ObjectId;
  hospitalName: string;
  name: string;
  type: 'general' | 'private' | 'semi-private' | 'icu' | 'nicu' | 'picu' | 'ccu' | 'emergency' | 'maternity' | 'pediatric' | 'surgical' | 'orthopedic';
  floor: number;
  building?: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  dailyRate: number;
  amenities: string[];
  description?: string;
  isActive: boolean;
  inchargeId?: mongoose.Schema.Types.ObjectId;
  inchargeName?: string;
  contactNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WardSchema: Schema = new Schema(
  {
    wardNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
    },
    hospitalName: {
      type: String,
      required: true,
      default: 'Qwesi AI Virtual Hospital',
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['general', 'private', 'semi-private', 'icu', 'nicu', 'picu', 'ccu', 'emergency', 'maternity', 'pediatric', 'surgical', 'orthopedic'],
      required: true,
    },
    floor: {
      type: Number,
      required: true,
      default: 1,
    },
    building: {
      type: String,
      trim: true,
    },
    totalBeds: {
      type: Number,
      required: true,
      default: 0,
    },
    occupiedBeds: {
      type: Number,
      default: 0,
    },
    availableBeds: {
      type: Number,
      default: 0,
    },
    dailyRate: {
      type: Number,
      required: true,
      default: 0,
    },
    amenities: [{
      type: String,
    }],
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inchargeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    inchargeName: {
      type: String,
    },
    contactNumber: {
      type: String,
    },
  },
  { timestamps: true }
);

WardSchema.index({ hospitalId: 1, type: 1, isActive: 1 });

const Ward = mongoose.models.Ward || mongoose.model<IWard>('Ward', WardSchema);

export default Ward;
