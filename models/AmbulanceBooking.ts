import mongoose, { Schema, Document } from 'mongoose';

export interface ILocationUpdate {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
  status: string;
}

export interface IAmbulanceBooking extends Document {
  bookingNumber: string;
  
  // Patient Information
  patientId?: mongoose.Schema.Types.ObjectId;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  
  // Pickup Details
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupLandmark?: string;
  
  // Destination Details
  destinationAddress: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  destinationType: 'hospital' | 'home' | 'clinic' | 'other';
  
  // Booking Details
  bookingType: 'emergency' | 'scheduled' | 'transfer';
  scheduledDateTime?: Date;
  priority: 'critical' | 'urgent' | 'normal';
  medicalCondition?: string;
  specialRequirements?: string[];
  requiresOxygen: boolean;
  requiresStretcher: boolean;
  requiresWheelchair: boolean;
  
  // Ambulance Assignment
  ambulanceId?: mongoose.Schema.Types.ObjectId;
  ambulanceNumber?: string;
  ambulanceType?: string;
  driverName?: string;
  driverPhone?: string;
  paramedicName?: string;
  paramedicPhone?: string;
  
  // Status & Tracking
  status: 'pending' | 'confirmed' | 'dispatched' | 'en-route-pickup' | 'at-pickup' | 'patient-loaded' | 'en-route-destination' | 'arrived' | 'completed' | 'cancelled';
  trackingUpdates: ILocationUpdate[];
  
  // Timing
  requestedAt: Date;
  confirmedAt?: Date;
  dispatchedAt?: Date;
  arrivedAtPickupAt?: Date;
  patientLoadedAt?: Date;
  arrivedAtDestinationAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  // Distance & Charges
  estimatedDistance?: number;
  actualDistance?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  
  // Billing
  baseCharge: number;
  distanceCharge: number;
  additionalCharges: number;
  totalCharge: number;
  currency: string;
  billingStatus: 'pending' | 'invoiced' | 'paid';
  invoiceId?: mongoose.Schema.Types.ObjectId;
  
  // Related Records
  emergencyCaseId?: mongoose.Schema.Types.ObjectId;
  admissionId?: mongoose.Schema.Types.ObjectId;
  
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationUpdateSchema: Schema = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String },
  timestamp: { type: Date, default: Date.now },
  status: { type: String },
});

const AmbulanceBookingSchema: Schema = new Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    
    // Patient Information
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    patientAge: { type: Number },
    patientGender: { type: String },
    emergencyContact: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    
    // Pickup Details
    pickupAddress: {
      type: String,
      required: true,
      trim: true,
    },
    pickupLatitude: { type: Number },
    pickupLongitude: { type: Number },
    pickupLandmark: { type: String, trim: true },
    
    // Destination Details
    destinationAddress: {
      type: String,
      required: true,
      trim: true,
    },
    destinationLatitude: { type: Number },
    destinationLongitude: { type: Number },
    destinationType: {
      type: String,
      enum: ['hospital', 'home', 'clinic', 'other'],
      default: 'hospital',
    },
    
    // Booking Details
    bookingType: {
      type: String,
      enum: ['emergency', 'scheduled', 'transfer'],
      required: true,
    },
    scheduledDateTime: { type: Date },
    priority: {
      type: String,
      enum: ['critical', 'urgent', 'normal'],
      default: 'normal',
    },
    medicalCondition: { type: String, trim: true },
    specialRequirements: [{ type: String }],
    requiresOxygen: { type: Boolean, default: false },
    requiresStretcher: { type: Boolean, default: true },
    requiresWheelchair: { type: Boolean, default: false },
    
    // Ambulance Assignment
    ambulanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ambulance',
    },
    ambulanceNumber: { type: String },
    ambulanceType: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    paramedicName: { type: String },
    paramedicPhone: { type: String },
    
    // Status & Tracking
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'dispatched', 'en-route-pickup', 'at-pickup', 'patient-loaded', 'en-route-destination', 'arrived', 'completed', 'cancelled'],
      default: 'pending',
    },
    trackingUpdates: [LocationUpdateSchema],
    
    // Timing
    requestedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    dispatchedAt: { type: Date },
    arrivedAtPickupAt: { type: Date },
    patientLoadedAt: { type: Date },
    arrivedAtDestinationAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    
    // Distance & Charges
    estimatedDistance: { type: Number },
    actualDistance: { type: Number },
    estimatedDuration: { type: Number },
    actualDuration: { type: Number },
    
    // Billing
    baseCharge: { type: Number, default: 0 },
    distanceCharge: { type: Number, default: 0 },
    additionalCharges: { type: Number, default: 0 },
    totalCharge: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    billingStatus: {
      type: String,
      enum: ['pending', 'invoiced', 'paid'],
      default: 'pending',
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    
    // Related Records
    emergencyCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyCase',
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
    },
    
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Generate booking number before saving
AmbulanceBookingSchema.pre('save', async function() {
  if (this.isNew && !this.bookingNumber) {
    const count = await mongoose.model('AmbulanceBooking').countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    this.bookingNumber = `AMB-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;
  }
});

// Indexes
AmbulanceBookingSchema.index({ bookingNumber: 1 });
AmbulanceBookingSchema.index({ patientId: 1 });
AmbulanceBookingSchema.index({ ambulanceId: 1 });
AmbulanceBookingSchema.index({ status: 1 });
AmbulanceBookingSchema.index({ bookingType: 1 });
AmbulanceBookingSchema.index({ requestedAt: -1 });
AmbulanceBookingSchema.index({ scheduledDateTime: 1 });

// Clear model cache
if (mongoose.models.AmbulanceBooking) {
  delete mongoose.models.AmbulanceBooking;
}

const AmbulanceBooking = mongoose.model<IAmbulanceBooking>('AmbulanceBooking', AmbulanceBookingSchema);

export default AmbulanceBooking;
