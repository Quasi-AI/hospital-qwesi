import mongoose, { Schema, Document } from 'mongoose';

export interface IBloodTransfusion extends Document {
  requestNumber: string;
  
  // Patient Information
  patientId: mongoose.Types.ObjectId;
  patientName: string;
  patientBloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  patientAge?: number;
  patientGender?: string;
  
  // Request Details
  requestedBloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  requestedComponent: 'whole-blood' | 'packed-rbc' | 'platelets' | 'plasma' | 'cryoprecipitate';
  unitsRequested: number;
  urgency: 'routine' | 'urgent' | 'emergency' | 'life-threatening';
  reason: string;
  diagnosis?: string;
  
  // Clinical Information
  hemoglobinLevel?: number;
  plateletCount?: number;
  previousTransfusions: number;
  previousReactions: boolean;
  reactionHistory?: string;
  
  // Compatibility Testing
  crossmatchStatus: 'pending' | 'compatible' | 'incompatible' | 'not-required';
  crossmatchDate?: Date;
  crossmatchPerformedBy?: string;
  antibodyScreening?: 'negative' | 'positive' | 'pending';
  
  // Blood Units Issued
  bloodUnits: {
    unitId: mongoose.Types.ObjectId;
    unitNumber: string;
    bloodGroup: string;
    component: string;
    volume: number;
    issuedAt: Date;
    status: 'issued' | 'transfused' | 'returned' | 'wasted';
  }[];
  
  // Request Status
  status: 'pending' | 'approved' | 'cross-matching' | 'ready' | 'in-progress' | 'completed' | 'cancelled' | 'rejected';
  rejectionReason?: string;
  
  // Requesting Details
  requestedBy: string;
  requestedByDepartment: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  
  // Transfusion Details
  transfusionStartedAt?: Date;
  transfusionCompletedAt?: Date;
  transfusedBy?: string;
  supervisingDoctor?: string;
  location?: string;
  
  // Vital Signs During Transfusion
  vitalSigns?: {
    time: Date;
    temperature?: number;
    bloodPressure?: { systolic: number; diastolic: number };
    pulseRate?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    notes?: string;
  }[];
  
  // Adverse Reactions
  hasAdverseReaction: boolean;
  adverseReaction?: {
    type: 'mild' | 'moderate' | 'severe' | 'life-threatening';
    symptoms: string[];
    onsetTime: Date;
    actionsTaken: string;
    outcome: string;
    reportedBy: string;
    reportedAt: Date;
  };
  
  // Post-Transfusion
  postTransfusionHemoglobin?: number;
  postTransfusionPlatelet?: number;
  effectivenessAssessment?: 'effective' | 'partially-effective' | 'ineffective' | 'pending';
  
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const BloodTransfusionSchema: Schema = new Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    
    // Patient Information
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientName: { type: String, required: true, trim: true },
    patientBloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    patientAge: { type: Number },
    patientGender: { type: String },
    
    // Request Details
    requestedBloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    requestedComponent: {
      type: String,
      enum: ['whole-blood', 'packed-rbc', 'platelets', 'plasma', 'cryoprecipitate'],
      required: true,
    },
    unitsRequested: { type: Number, required: true, min: 1 },
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency', 'life-threatening'],
      default: 'routine',
    },
    reason: { type: String, required: true },
    diagnosis: { type: String },
    
    // Clinical Information
    hemoglobinLevel: { type: Number },
    plateletCount: { type: Number },
    previousTransfusions: { type: Number, default: 0 },
    previousReactions: { type: Boolean, default: false },
    reactionHistory: { type: String },
    
    // Compatibility Testing
    crossmatchStatus: {
      type: String,
      enum: ['pending', 'compatible', 'incompatible', 'not-required'],
      default: 'pending',
    },
    crossmatchDate: { type: Date },
    crossmatchPerformedBy: { type: String },
    antibodyScreening: {
      type: String,
      enum: ['negative', 'positive', 'pending'],
    },
    
    // Blood Units Issued
    bloodUnits: [{
      unitId: { type: Schema.Types.ObjectId, ref: 'BloodInventory' },
      unitNumber: { type: String },
      bloodGroup: { type: String },
      component: { type: String },
      volume: { type: Number },
      issuedAt: { type: Date },
      status: {
        type: String,
        enum: ['issued', 'transfused', 'returned', 'wasted'],
        default: 'issued',
      },
    }],
    
    // Request Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'cross-matching', 'ready', 'in-progress', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    
    // Requesting Details
    requestedBy: { type: String, required: true },
    requestedByDepartment: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    
    // Transfusion Details
    transfusionStartedAt: { type: Date },
    transfusionCompletedAt: { type: Date },
    transfusedBy: { type: String },
    supervisingDoctor: { type: String },
    location: { type: String },
    
    // Vital Signs During Transfusion
    vitalSigns: [{
      time: { type: Date },
      temperature: { type: Number },
      bloodPressure: {
        systolic: { type: Number },
        diastolic: { type: Number },
      },
      pulseRate: { type: Number },
      respiratoryRate: { type: Number },
      oxygenSaturation: { type: Number },
      notes: { type: String },
    }],
    
    // Adverse Reactions
    hasAdverseReaction: { type: Boolean, default: false },
    adverseReaction: {
      type: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'life-threatening'],
      },
      symptoms: [{ type: String }],
      onsetTime: { type: Date },
      actionsTaken: { type: String },
      outcome: { type: String },
      reportedBy: { type: String },
      reportedAt: { type: Date },
    },
    
    // Post-Transfusion
    postTransfusionHemoglobin: { type: Number },
    postTransfusionPlatelet: { type: Number },
    effectivenessAssessment: {
      type: String,
      enum: ['effective', 'partially-effective', 'ineffective', 'pending'],
    },
    
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes
BloodTransfusionSchema.index({ patientId: 1 });
BloodTransfusionSchema.index({ status: 1 });
BloodTransfusionSchema.index({ urgency: 1 });
BloodTransfusionSchema.index({ requestedAt: -1 });
BloodTransfusionSchema.index({ requestedBloodGroup: 1 });

// Clear model cache
if (mongoose.models.BloodTransfusion) {
  delete mongoose.models.BloodTransfusion;
}

const BloodTransfusion = mongoose.model<IBloodTransfusion>('BloodTransfusion', BloodTransfusionSchema);

export default BloodTransfusion;
