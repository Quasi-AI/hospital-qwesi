import mongoose, { Schema, Document } from 'mongoose';

export interface IBloodDonor extends Document {
  donorId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  
  // Contact Information
  email?: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Medical Information
  weight: number; // in kg
  height?: number; // in cm
  hemoglobin?: number; // g/dL
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  pulseRate?: number;
  
  // Health Screening
  hasChronicDisease: boolean;
  chronicDiseases?: string[];
  hasTattoo: boolean;
  tattooDate?: Date;
  hasRecentSurgery: boolean;
  surgeryDate?: Date;
  isOnMedication: boolean;
  currentMedications?: string[];
  hasAllergies: boolean;
  allergies?: string[];
  
  // Donation History
  totalDonations: number;
  lastDonationDate?: Date;
  nextEligibleDate?: Date;
  donations: {
    donationDate: Date;
    unitNumber: string;
    volume: number;
    component: string;
    location: string;
    notes?: string;
  }[];
  
  // Status
  status: 'active' | 'inactive' | 'deferred' | 'permanently-deferred';
  deferralReason?: string;
  deferralEndDate?: Date;
  
  // Emergency Contact
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  // Consent
  consentGiven: boolean;
  consentDate?: Date;
  
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const BloodDonorSchema: Schema = new Schema(
  {
    donorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    
    // Contact Information
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    
    // Medical Information
    weight: { type: Number, required: true },
    height: { type: Number },
    hemoglobin: { type: Number },
    bloodPressure: {
      systolic: { type: Number },
      diastolic: { type: Number },
    },
    pulseRate: { type: Number },
    
    // Health Screening
    hasChronicDisease: { type: Boolean, default: false },
    chronicDiseases: [{ type: String }],
    hasTattoo: { type: Boolean, default: false },
    tattooDate: { type: Date },
    hasRecentSurgery: { type: Boolean, default: false },
    surgeryDate: { type: Date },
    isOnMedication: { type: Boolean, default: false },
    currentMedications: [{ type: String }],
    hasAllergies: { type: Boolean, default: false },
    allergies: [{ type: String }],
    
    // Donation History
    totalDonations: { type: Number, default: 0 },
    lastDonationDate: { type: Date },
    nextEligibleDate: { type: Date },
    donations: [{
      donationDate: { type: Date },
      unitNumber: { type: String },
      volume: { type: Number },
      component: { type: String },
      location: { type: String },
      notes: { type: String },
    }],
    
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'deferred', 'permanently-deferred'],
      default: 'active',
    },
    deferralReason: { type: String },
    deferralEndDate: { type: Date },
    
    // Emergency Contact
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
    },
    
    // Consent
    consentGiven: { type: Boolean, default: false },
    consentDate: { type: Date },
    
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes
BloodDonorSchema.index({ bloodGroup: 1 });
BloodDonorSchema.index({ status: 1 });
BloodDonorSchema.index({ phone: 1 });
BloodDonorSchema.index({ lastName: 1, firstName: 1 });
BloodDonorSchema.index({ lastDonationDate: 1 });

// Virtual for full name
BloodDonorSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Clear model cache
if (mongoose.models.BloodDonor) {
  delete mongoose.models.BloodDonor;
}

const BloodDonor = mongoose.model<IBloodDonor>('BloodDonor', BloodDonorSchema);

export default BloodDonor;
