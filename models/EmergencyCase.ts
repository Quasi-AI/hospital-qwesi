import mongoose, { Schema, Document } from 'mongoose';

export interface IEmergencyProcedure {
  procedureName: string;
  performedBy: string;
  performedAt: Date;
  notes?: string;
  outcome?: string;
}

export interface IEmergencyMedication {
  medicationName: string;
  dosage: string;
  route: 'oral' | 'iv' | 'im' | 'sc' | 'topical' | 'inhalation' | 'other';
  administeredBy: string;
  administeredAt: Date;
  notes?: string;
}

export interface IVitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  painLevel?: number;
  recordedAt: Date;
  recordedBy: string;
}

export interface IEmergencyCase extends Document {
  caseNumber: string;
  patientId: mongoose.Schema.Types.ObjectId;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  
  // Triage Information
  triageLevel: 'critical' | 'urgent' | 'moderate' | 'minor' | 'non-urgent';
  triageNotes?: string;
  triagedBy?: string;
  triagedAt?: Date;
  
  // Chief Complaint & Assessment
  chiefComplaint: string;
  arrivalMode: 'walk-in' | 'ambulance' | 'police' | 'referral' | 'other';
  arrivalTime: Date;
  injuryType?: 'trauma' | 'medical' | 'surgical' | 'pediatric' | 'obstetric' | 'psychiatric' | 'other';
  symptoms?: string[];
  allergies?: string[];
  currentMedications?: string[];
  
  // Vital Signs History
  vitalSigns: IVitalSigns[];
  
  // Treatment
  diagnosis?: string;
  procedures: IEmergencyProcedure[];
  medications: IEmergencyMedication[];
  treatmentNotes?: string;
  
  // Attending Staff
  attendingDoctorId?: mongoose.Schema.Types.ObjectId;
  attendingDoctorName?: string;
  nurseInCharge?: string;
  
  // Status & Disposition
  status: 'waiting' | 'in-triage' | 'in-treatment' | 'under-observation' | 'ready-for-discharge' | 'transferred' | 'admitted' | 'discharged' | 'deceased' | 'left-ama';
  disposition?: 'discharged' | 'admitted' | 'transferred' | 'deceased' | 'left-ama';
  
  // Transfer Information
  transferTo?: string;
  transferReason?: string;
  transferredAt?: Date;
  
  // Admission (if admitted)
  admissionId?: mongoose.Schema.Types.ObjectId;
  admittedToWard?: string;
  
  // Discharge Information
  dischargedAt?: Date;
  dischargedBy?: string;
  dischargeInstructions?: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
  
  // Billing
  billingStatus: 'pending' | 'billed' | 'paid';
  invoiceId?: mongoose.Schema.Types.ObjectId;
  
  // Timestamps
  waitingStartTime?: Date;
  treatmentStartTime?: Date;
  treatmentEndTime?: Date;
  totalWaitingTime?: number; // in minutes
  totalTreatmentTime?: number; // in minutes
  
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyProcedureSchema: Schema = new Schema({
  procedureName: { type: String, required: true },
  performedBy: { type: String, required: true },
  performedAt: { type: Date, default: Date.now },
  notes: { type: String },
  outcome: { type: String },
});

const EmergencyMedicationSchema: Schema = new Schema({
  medicationName: { type: String, required: true },
  dosage: { type: String, required: true },
  route: { 
    type: String, 
    enum: ['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'other'],
    default: 'iv'
  },
  administeredBy: { type: String, required: true },
  administeredAt: { type: Date, default: Date.now },
  notes: { type: String },
});

const VitalSignsSchema: Schema = new Schema({
  bloodPressure: { type: String },
  heartRate: { type: Number },
  temperature: { type: Number },
  respiratoryRate: { type: Number },
  oxygenSaturation: { type: Number },
  painLevel: { type: Number, min: 0, max: 10 },
  recordedAt: { type: Date, default: Date.now },
  recordedBy: { type: String, required: true },
});

const EmergencyCaseSchema: Schema = new Schema(
  {
    caseNumber: {
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
      trim: true,
    },
    patientAge: { type: Number },
    patientGender: { type: String },
    patientPhone: { type: String },
    
    // Triage
    triageLevel: {
      type: String,
      enum: ['critical', 'urgent', 'moderate', 'minor', 'non-urgent'],
      required: true,
    },
    triageNotes: { type: String },
    triagedBy: { type: String },
    triagedAt: { type: Date },
    
    // Arrival & Chief Complaint
    chiefComplaint: {
      type: String,
      required: true,
      trim: true,
    },
    arrivalMode: {
      type: String,
      enum: ['walk-in', 'ambulance', 'police', 'referral', 'other'],
      default: 'walk-in',
    },
    arrivalTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    injuryType: {
      type: String,
      enum: ['trauma', 'medical', 'surgical', 'pediatric', 'obstetric', 'psychiatric', 'other'],
    },
    symptoms: [{ type: String }],
    allergies: [{ type: String }],
    currentMedications: [{ type: String }],
    
    // Vital Signs
    vitalSigns: [VitalSignsSchema],
    
    // Treatment
    diagnosis: { type: String },
    procedures: [EmergencyProcedureSchema],
    medications: [EmergencyMedicationSchema],
    treatmentNotes: { type: String },
    
    // Staff
    attendingDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    attendingDoctorName: { type: String },
    nurseInCharge: { type: String },
    
    // Status
    status: {
      type: String,
      enum: ['waiting', 'in-triage', 'in-treatment', 'under-observation', 'ready-for-discharge', 'transferred', 'admitted', 'discharged', 'deceased', 'left-ama'],
      default: 'waiting',
    },
    disposition: {
      type: String,
      enum: ['discharged', 'admitted', 'transferred', 'deceased', 'left-ama'],
    },
    
    // Transfer
    transferTo: { type: String },
    transferReason: { type: String },
    transferredAt: { type: Date },
    
    // Admission
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
    },
    admittedToWard: { type: String },
    
    // Discharge
    dischargedAt: { type: Date },
    dischargedBy: { type: String },
    dischargeInstructions: { type: String },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    
    // Billing
    billingStatus: {
      type: String,
      enum: ['pending', 'billed', 'paid'],
      default: 'pending',
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    
    // Time Tracking
    waitingStartTime: { type: Date },
    treatmentStartTime: { type: Date },
    treatmentEndTime: { type: Date },
    totalWaitingTime: { type: Number },
    totalTreatmentTime: { type: Number },
    
    notes: { type: String },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Generate case number before saving
EmergencyCaseSchema.pre('save', async function() {
  if (this.isNew && !this.caseNumber) {
    const count = await mongoose.model('EmergencyCase').countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    this.caseNumber = `ER-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Set waiting start time if status changes to waiting
  if (this.isNew && this.status === 'waiting' && !this.waitingStartTime) {
    this.waitingStartTime = new Date();
  }
});

// Indexes
EmergencyCaseSchema.index({ patientId: 1 });
EmergencyCaseSchema.index({ status: 1 });
EmergencyCaseSchema.index({ triageLevel: 1 });
EmergencyCaseSchema.index({ arrivalTime: -1 });
EmergencyCaseSchema.index({ createdAt: -1 });

// Clear model cache
if (mongoose.models.EmergencyCase) {
  delete mongoose.models.EmergencyCase;
}

const EmergencyCase = mongoose.model<IEmergencyCase>('EmergencyCase', EmergencyCaseSchema);

export default EmergencyCase;
