import mongoose, { Schema, Document } from 'mongoose';

export interface IBloodInventory extends Document {
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  component: 'whole-blood' | 'packed-rbc' | 'platelets' | 'plasma' | 'cryoprecipitate';
  unitNumber: string;
  bagNumber: string;
  volume: number; // in mL
  
  // Donor Information
  donorId?: mongoose.Types.ObjectId;
  donorName?: string;
  donationDate: Date;
  
  // Testing & Safety
  testingStatus: 'pending' | 'tested' | 'cleared' | 'rejected';
  hivTest?: 'negative' | 'positive' | 'pending';
  hbsAgTest?: 'negative' | 'positive' | 'pending'; // Hepatitis B
  hcvTest?: 'negative' | 'positive' | 'pending'; // Hepatitis C
  vdrlTest?: 'negative' | 'positive' | 'pending'; // Syphilis
  malariaTest?: 'negative' | 'positive' | 'pending';
  
  // Storage
  storageLocation: string;
  temperature?: number;
  collectionDate: Date;
  expiryDate: Date;
  
  // Status
  status: 'available' | 'reserved' | 'issued' | 'expired' | 'discarded' | 'quarantine';
  reservedFor?: {
    patientId: mongoose.Types.ObjectId;
    patientName: string;
    reservedAt: Date;
    reservedBy: string;
  };
  
  // Tracking
  issuedTo?: {
    patientId: mongoose.Types.ObjectId;
    patientName: string;
    issuedAt: Date;
    issuedBy: string;
    transfusionId?: mongoose.Types.ObjectId;
  };
  
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const BloodInventorySchema: Schema = new Schema(
  {
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    component: {
      type: String,
      enum: ['whole-blood', 'packed-rbc', 'platelets', 'plasma', 'cryoprecipitate'],
      required: true,
    },
    unitNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    bagNumber: {
      type: String,
      required: true,
      trim: true,
    },
    volume: {
      type: Number,
      required: true,
      default: 450, // Standard unit is 450mL
    },
    
    // Donor Information
    donorId: { type: Schema.Types.ObjectId, ref: 'BloodDonor' },
    donorName: { type: String, trim: true },
    donationDate: { type: Date, required: true },
    
    // Testing & Safety
    testingStatus: {
      type: String,
      enum: ['pending', 'tested', 'cleared', 'rejected'],
      default: 'pending',
    },
    hivTest: {
      type: String,
      enum: ['negative', 'positive', 'pending'],
      default: 'pending',
    },
    hbsAgTest: {
      type: String,
      enum: ['negative', 'positive', 'pending'],
      default: 'pending',
    },
    hcvTest: {
      type: String,
      enum: ['negative', 'positive', 'pending'],
      default: 'pending',
    },
    vdrlTest: {
      type: String,
      enum: ['negative', 'positive', 'pending'],
      default: 'pending',
    },
    malariaTest: {
      type: String,
      enum: ['negative', 'positive', 'pending'],
      default: 'pending',
    },
    
    // Storage
    storageLocation: { type: String, required: true, trim: true },
    temperature: { type: Number },
    collectionDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    
    // Status
    status: {
      type: String,
      enum: ['available', 'reserved', 'issued', 'expired', 'discarded', 'quarantine'],
      default: 'quarantine',
    },
    reservedFor: {
      patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
      patientName: { type: String },
      reservedAt: { type: Date },
      reservedBy: { type: String },
    },
    
    // Tracking
    issuedTo: {
      patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
      patientName: { type: String },
      issuedAt: { type: Date },
      issuedBy: { type: String },
      transfusionId: { type: Schema.Types.ObjectId, ref: 'BloodTransfusion' },
    },
    
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes
BloodInventorySchema.index({ unitNumber: 1 });
BloodInventorySchema.index({ bloodGroup: 1, status: 1 });
BloodInventorySchema.index({ component: 1 });
BloodInventorySchema.index({ expiryDate: 1 });
BloodInventorySchema.index({ testingStatus: 1 });
BloodInventorySchema.index({ status: 1 });

// Clear model cache
if (mongoose.models.BloodInventory) {
  delete mongoose.models.BloodInventory;
}

const BloodInventory = mongoose.model<IBloodInventory>('BloodInventory', BloodInventorySchema);

export default BloodInventory;
