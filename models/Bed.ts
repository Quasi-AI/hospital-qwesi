import mongoose, { Schema, Document } from 'mongoose';

export interface IBed extends Document {
  bedNumber: string;
  wardId: mongoose.Schema.Types.ObjectId;
  wardName: string;
  wardType: string;
  type: 'standard' | 'electric' | 'icu' | 'pediatric' | 'bariatric' | 'stretcher';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'cleaning';
  currentPatientId?: mongoose.Schema.Types.ObjectId;
  currentPatientName?: string;
  currentAdmissionId?: mongoose.Schema.Types.ObjectId;
  features: string[];
  dailyRate: number;
  position?: string; // e.g., "Window", "Aisle", "Corner"
  notes?: string;
  lastCleanedAt?: Date;
  lastMaintenanceAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BedSchema: Schema = new Schema(
  {
    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
      required: true,
    },
    wardName: {
      type: String,
      required: true,
    },
    wardType: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['standard', 'electric', 'icu', 'pediatric', 'bariatric', 'stretcher'],
      default: 'standard',
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'maintenance', 'cleaning'],
      default: 'available',
    },
    currentPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    currentPatientName: {
      type: String,
    },
    currentAdmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
    },
    features: [{
      type: String,
    }],
    dailyRate: {
      type: Number,
      required: true,
      default: 0,
    },
    position: {
      type: String,
    },
    notes: {
      type: String,
    },
    lastCleanedAt: {
      type: Date,
    },
    lastMaintenanceAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound unique index for bed number within a ward
BedSchema.index({ bedNumber: 1, wardId: 1 }, { unique: true });

const Bed = mongoose.models.Bed || mongoose.model<IBed>('Bed', BedSchema);

export default Bed;
