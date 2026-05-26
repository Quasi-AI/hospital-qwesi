import mongoose, { Schema, Document } from 'mongoose';

export interface IVitalSign {
  timestamp: Date;
  bloodPressure?: string;
  pulse?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  notes?: string;
  recordedBy?: string;
}

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  prescribedBy: string;
}

export interface INursingNote {
  timestamp: Date;
  note: string;
  nurseId: mongoose.Schema.Types.ObjectId;
  nurseName: string;
  category: 'routine' | 'observation' | 'medication' | 'procedure' | 'incident' | 'other';
}

export interface IAdmission extends Document {
  admissionNumber: string;
  patientId: mongoose.Schema.Types.ObjectId;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: string;
  wardId: mongoose.Schema.Types.ObjectId;
  wardName: string;
  bedId: mongoose.Schema.Types.ObjectId;
  bedNumber: string;
  admittingDoctorId: mongoose.Schema.Types.ObjectId;
  admittingDoctorName: string;
  attendingDoctorId?: mongoose.Schema.Types.ObjectId;
  attendingDoctorName?: string;
  admissionType: 'emergency' | 'elective' | 'transfer' | 'referral';
  admissionDate: Date;
  expectedDischargeDate?: Date;
  actualDischargeDate?: Date;
  chiefComplaint: string;
  admissionDiagnosis?: string;
  finalDiagnosis?: string;
  status: 'admitted' | 'in-treatment' | 'ready-for-discharge' | 'discharged' | 'transferred' | 'deceased' | 'lama';
  priority: 'normal' | 'urgent' | 'critical';
  vitalSigns: IVitalSign[];
  medications: IMedication[];
  nursingNotes: INursingNote[];
  procedures: string[];
  allergies: string[];
  dietaryRestrictions?: string;
  specialInstructions?: string;
  insuranceInfo?: {
    provider?: string;
    policyNumber?: string;
    preAuthNumber?: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  dischargeInfo?: {
    dischargeType: 'normal' | 'against-medical-advice' | 'transfer' | 'deceased';
    dischargeSummary?: string;
    dischargeInstructions?: string;
    followUpDate?: Date;
    followUpInstructions?: string;
    medicationsOnDischarge?: string[];
    dischargedBy?: string;
    dischargedAt?: Date;
  };
  totalCharges?: number;
  invoiceId?: mongoose.Schema.Types.ObjectId;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const VitalSignSchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now },
  bloodPressure: { type: String },
  pulse: { type: Number },
  temperature: { type: Number },
  respiratoryRate: { type: Number },
  oxygenSaturation: { type: Number },
  weight: { type: Number },
  notes: { type: String },
  recordedBy: { type: String },
});

const MedicationSchema: Schema = new Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  route: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  notes: { type: String },
  prescribedBy: { type: String, required: true },
});

const NursingNoteSchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now },
  note: { type: String, required: true },
  nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nurseName: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['routine', 'observation', 'medication', 'procedure', 'incident', 'other'],
    default: 'routine'
  },
});

const AdmissionSchema: Schema = new Schema(
  {
    admissionNumber: {
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
    patientEmail: { type: String },
    patientPhone: { type: String },
    patientAge: { type: Number },
    patientGender: { type: String },
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
      required: true,
    },
    wardName: {
      type: String,
      required: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      required: true,
    },
    bedNumber: {
      type: String,
      required: true,
    },
    admittingDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admittingDoctorName: {
      type: String,
      required: true,
    },
    attendingDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    attendingDoctorName: { type: String },
    admissionType: {
      type: String,
      enum: ['emergency', 'elective', 'transfer', 'referral'],
      default: 'elective',
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    expectedDischargeDate: { type: Date },
    actualDischargeDate: { type: Date },
    chiefComplaint: {
      type: String,
      required: true,
    },
    admissionDiagnosis: { type: String },
    finalDiagnosis: { type: String },
    status: {
      type: String,
      enum: ['admitted', 'in-treatment', 'ready-for-discharge', 'discharged', 'transferred', 'deceased', 'lama'],
      default: 'admitted',
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent', 'critical'],
      default: 'normal',
    },
    vitalSigns: [VitalSignSchema],
    medications: [MedicationSchema],
    nursingNotes: [NursingNoteSchema],
    procedures: [{ type: String }],
    allergies: [{ type: String }],
    dietaryRestrictions: { type: String },
    specialInstructions: { type: String },
    insuranceInfo: {
      provider: { type: String },
      policyNumber: { type: String },
      preAuthNumber: { type: String },
    },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
    },
    dischargeInfo: {
      dischargeType: { 
        type: String, 
        enum: ['normal', 'against-medical-advice', 'transfer', 'deceased'] 
      },
      dischargeSummary: { type: String },
      dischargeInstructions: { type: String },
      followUpDate: { type: Date },
      followUpInstructions: { type: String },
      medicationsOnDischarge: [{ type: String }],
      dischargedBy: { type: String },
      dischargedAt: { type: Date },
    },
    totalCharges: { type: Number, default: 0 },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate admission number
AdmissionSchema.pre('save', async function () {
  if (this.isNew && !this.admissionNumber) {
    const count = (await mongoose.models.Admission?.countDocuments()) || 0;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequence = String(count + 1).padStart(5, '0');
    this.admissionNumber = `ADM-${year}${month}${day}-${sequence}`;
  }
});

// Clear model cache to ensure schema changes are picked up
if (mongoose.models.Admission) {
  delete mongoose.models.Admission;
}

const Admission = mongoose.model<IAdmission>('Admission', AdmissionSchema);

export default Admission;
