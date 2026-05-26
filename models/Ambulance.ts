import mongoose, { Schema, Document } from 'mongoose';

export interface IAmbulance extends Document {
  vehicleNumber: string;
  vehicleType: 'basic' | 'advanced' | 'icu' | 'neonatal' | 'patient-transport';
  model: string;
  manufacturer?: string;
  yearOfManufacture?: number;
  capacity: number;
  
  // Equipment
  equipment: string[];
  hasOxygen: boolean;
  hasDefibrillator: boolean;
  hasStretcher: boolean;
  hasVentilator: boolean;
  
  // Driver Information
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverLicense?: string;
  
  // Paramedic Information
  paramedicId?: string;
  paramedicName?: string;
  paramedicPhone?: string;
  
  // Status
  status: 'available' | 'on-call' | 'en-route' | 'at-scene' | 'transporting' | 'at-hospital' | 'maintenance' | 'out-of-service';
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    updatedAt: Date;
  };
  
  // Service Details
  baseChargePerKm: number;
  baseCharge: number;
  currency: string;
  
  // Insurance & Registration
  registrationNumber?: string;
  registrationExpiry?: Date;
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  
  notes?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AmbulanceSchema: Schema = new Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['basic', 'advanced', 'icu', 'neonatal', 'patient-transport'],
      required: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    manufacturer: { type: String, trim: true },
    yearOfManufacture: { type: Number },
    capacity: { type: Number, default: 1 },
    
    // Equipment
    equipment: [{ type: String }],
    hasOxygen: { type: Boolean, default: false },
    hasDefibrillator: { type: Boolean, default: false },
    hasStretcher: { type: Boolean, default: true },
    hasVentilator: { type: Boolean, default: false },
    
    // Driver
    driverId: { type: String },
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    driverLicense: { type: String, trim: true },
    
    // Paramedic
    paramedicId: { type: String },
    paramedicName: { type: String, trim: true },
    paramedicPhone: { type: String, trim: true },
    
    // Status
    status: {
      type: String,
      enum: ['available', 'on-call', 'en-route', 'at-scene', 'transporting', 'at-hospital', 'maintenance', 'out-of-service'],
      default: 'available',
    },
    currentLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      updatedAt: { type: Date },
    },
    
    // Charges
    baseChargePerKm: { type: Number, default: 10 },
    baseCharge: { type: Number, default: 500 },
    currency: { type: String, default: 'USD' },
    
    // Registration & Insurance
    registrationNumber: { type: String, trim: true },
    registrationExpiry: { type: Date },
    insuranceNumber: { type: String, trim: true },
    insuranceExpiry: { type: Date },
    lastServiceDate: { type: Date },
    nextServiceDue: { type: Date },
    
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes
AmbulanceSchema.index({ status: 1 });
AmbulanceSchema.index({ vehicleType: 1 });
AmbulanceSchema.index({ isActive: 1 });

// Clear model cache
if (mongoose.models.Ambulance) {
  delete mongoose.models.Ambulance;
}

const Ambulance = mongoose.model<IAmbulance>('Ambulance', AmbulanceSchema);

export default Ambulance;
