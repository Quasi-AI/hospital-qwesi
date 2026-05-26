import mongoose, { Schema, Document } from 'mongoose';

export interface IRadiologyImage {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
  uploadedBy: string;
  annotations?: {
    type: string;
    coordinates: string;
    note: string;
    createdBy: string;
    createdAt: Date;
  }[];
}

export interface IRadiologyStudy extends Document {
  studyNumber: string;
  patientId: mongoose.Schema.Types.ObjectId;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  referringDoctorId?: mongoose.Schema.Types.ObjectId;
  referringDoctorName?: string;
  radiologistId?: mongoose.Schema.Types.ObjectId;
  radiologistName?: string;
  studyType: 'x-ray' | 'ct-scan' | 'mri' | 'ultrasound' | 'mammography' | 'fluoroscopy' | 'pet-scan' | 'dexa-scan' | 'other';
  bodyPart: string;
  studyDescription: string;
  clinicalHistory?: string;
  indication?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'scheduled' | 'in-progress' | 'completed' | 'reported' | 'verified' | 'cancelled';
  scheduledDate?: Date;
  performedDate?: Date;
  images: IRadiologyImage[];
  findings?: string;
  impression?: string;
  recommendations?: string;
  reportedBy?: string;
  reportedAt?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  isCritical: boolean;
  criticalFindings?: string;
  previousStudyId?: mongoose.Schema.Types.ObjectId;
  comparisonNotes?: string;
  technicianId?: mongoose.Schema.Types.ObjectId;
  technicianName?: string;
  technicianNotes?: string;
  contrastUsed: boolean;
  contrastDetails?: string;
  radiationDose?: string;
  equipmentUsed?: string;
  billingStatus: 'pending' | 'billed' | 'paid';
  invoiceId?: mongoose.Schema.Types.ObjectId;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const RadiologyImageSchema: Schema = new Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  annotations: [{
    type: { type: String },
    coordinates: { type: String },
    note: { type: String },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
});

const RadiologyStudySchema: Schema = new Schema(
  {
    studyNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientAge: { type: Number },
    patientGender: { type: String },
    referringDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    referringDoctorName: { type: String },
    radiologistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    radiologistName: { type: String },
    studyType: {
      type: String,
      enum: ['x-ray', 'ct-scan', 'mri', 'ultrasound', 'mammography', 'fluoroscopy', 'pet-scan', 'dexa-scan', 'other'],
      required: true,
    },
    bodyPart: {
      type: String,
      required: true,
    },
    studyDescription: {
      type: String,
      required: true,
    },
    clinicalHistory: { type: String },
    indication: { type: String },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'stat'],
      default: 'routine',
    },
    status: {
      type: String,
      enum: ['ordered', 'scheduled', 'in-progress', 'completed', 'reported', 'verified', 'cancelled'],
      default: 'ordered',
    },
    scheduledDate: { type: Date },
    performedDate: { type: Date },
    images: [RadiologyImageSchema],
    findings: { type: String },
    impression: { type: String },
    recommendations: { type: String },
    reportedBy: { type: String },
    reportedAt: { type: Date },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },
    isCritical: {
      type: Boolean,
      default: false,
    },
    criticalFindings: { type: String },
    previousStudyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RadiologyStudy',
    },
    comparisonNotes: { type: String },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    technicianName: { type: String },
    technicianNotes: { type: String },
    contrastUsed: {
      type: Boolean,
      default: false,
    },
    contrastDetails: { type: String },
    radiationDose: { type: String },
    equipmentUsed: { type: String },
    billingStatus: {
      type: String,
      enum: ['pending', 'billed', 'paid'],
      default: 'pending',
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    notes: { type: String },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Clear model cache to ensure schema changes are picked up
if (mongoose.models.RadiologyStudy) {
  delete mongoose.models.RadiologyStudy;
}

const RadiologyStudy = mongoose.model<IRadiologyStudy>('RadiologyStudy', RadiologyStudySchema);

export default RadiologyStudy;
