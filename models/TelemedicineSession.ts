import mongoose, { Schema, Document, Types } from 'mongoose';

// Chat message interface
interface IChatMessage {
  senderId: Types.ObjectId;
  senderType: 'doctor' | 'patient';
  senderName: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'prescription';
  fileUrl?: string;
  fileName?: string;
  timestamp: Date;
  read: boolean;
}

// Session participant interface
interface IParticipant {
  odId: Types.ObjectId;
  odType: 'doctor' | 'patient';
  name: string;
  joinedAt?: Date;
  leftAt?: Date;
  connectionStatus: 'waiting' | 'connected' | 'disconnected' | 'reconnecting';
}

// Vital signs recorded during session
interface IVitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  recordedAt: Date;
  notes?: string;
}

// Main telemedicine session interface
export interface ITelemedicineSession extends Document {
  sessionNumber: string;
  appointmentId?: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  consultationType: 'video' | 'audio' | 'chat';
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' | 'technical-issue';
  
  // Room/connection details
  roomId: string;
  roomUrl?: string;
  accessToken?: string;
  recordingEnabled: boolean;
  recordingUrl?: string;
  
  // Participants
  participants: IParticipant[];
  
  // Chat messages
  chatMessages: IChatMessage[];
  
  // Clinical data
  chiefComplaint?: string;
  symptoms?: string[];
  diagnosis?: string;
  clinicalNotes?: string;
  vitalSigns?: IVitalSigns[];
  prescriptionId?: Types.ObjectId;
  followUpRequired: boolean;
  followUpDate?: Date;
  
  // Billing
  consultationFee: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'waived' | 'refunded';
  invoiceId?: Types.ObjectId;
  
  // Technical details
  patientDevice?: string;
  doctorDevice?: string;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  technicalIssues?: string[];
  
  // Ratings & feedback
  patientRating?: number;
  patientFeedback?: string;
  doctorNotes?: string;
  
  // Metadata
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  senderId: { type: Schema.Types.ObjectId, required: true },
  senderType: { type: String, enum: ['doctor', 'patient'], required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'image', 'file', 'prescription'], default: 'text' },
  fileUrl: String,
  fileName: String,
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
}, { _id: true });

const ParticipantSchema = new Schema<IParticipant>({
  odId: { type: Schema.Types.ObjectId, required: true },
  odType: { type: String, enum: ['doctor', 'patient'], required: true },
  name: { type: String, required: true },
  joinedAt: Date,
  leftAt: Date,
  connectionStatus: { 
    type: String, 
    enum: ['waiting', 'connected', 'disconnected', 'reconnecting'],
    default: 'waiting'
  },
}, { _id: false });

const VitalSignsSchema = new Schema<IVitalSigns>({
  bloodPressure: String,
  heartRate: Number,
  temperature: Number,
  oxygenSaturation: Number,
  weight: Number,
  height: Number,
  recordedAt: { type: Date, default: Date.now },
  notes: String,
}, { _id: false });

const TelemedicineSessionSchema = new Schema<ITelemedicineSession>({
  sessionNumber: { 
    type: String, 
    unique: true,
    sparse: true,
    index: true
  },
  appointmentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Appointment',
    index: true
  },
  patientId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true,
    index: true
  },
  doctorId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  consultationType: { 
    type: String, 
    enum: ['video', 'audio', 'chat'],
    required: true,
    default: 'video'
  },
  scheduledStartTime: { type: Date, required: true, index: true },
  scheduledEndTime: { type: Date, required: true },
  actualStartTime: Date,
  actualEndTime: Date,
  status: { 
    type: String, 
    enum: ['scheduled', 'waiting', 'in-progress', 'completed', 'cancelled', 'no-show', 'technical-issue'],
    default: 'scheduled',
    index: true
  },
  
  // Room details
  roomId: { type: String, unique: true, sparse: true },
  roomUrl: String,
  accessToken: String,
  recordingEnabled: { type: Boolean, default: false },
  recordingUrl: String,
  
  // Participants
  participants: [ParticipantSchema],
  
  // Chat messages
  chatMessages: [ChatMessageSchema],
  
  // Clinical data
  chiefComplaint: String,
  symptoms: [String],
  diagnosis: String,
  clinicalNotes: String,
  vitalSigns: [VitalSignsSchema],
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'MedicalReport' },
  followUpRequired: { type: Boolean, default: false },
  followUpDate: Date,
  
  // Billing
  consultationFee: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'waived', 'refunded'],
    default: 'pending'
  },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  
  // Technical details
  patientDevice: String,
  doctorDevice: String,
  connectionQuality: { 
    type: String, 
    enum: ['excellent', 'good', 'fair', 'poor']
  },
  technicalIssues: [String],
  
  // Ratings & feedback
  patientRating: { type: Number, min: 1, max: 5 },
  patientFeedback: String,
  doctorNotes: String,
  
  // Metadata
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Indexes for efficient queries
TelemedicineSessionSchema.index({ scheduledStartTime: 1, status: 1 });
TelemedicineSessionSchema.index({ patientId: 1, scheduledStartTime: -1 });
TelemedicineSessionSchema.index({ doctorId: 1, scheduledStartTime: -1 });
TelemedicineSessionSchema.index({ status: 1, scheduledStartTime: 1 });

// Generate session number and room ID before validation
TelemedicineSessionSchema.pre('validate', async function() {
  if (this.isNew && !this.sessionNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('TelemedicineSession').countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    this.sessionNumber = `TM-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Generate room ID if not set
  if (this.isNew && !this.roomId) {
    this.roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
});

// Virtual for session duration
TelemedicineSessionSchema.virtual('duration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.round((this.actualEndTime.getTime() - this.actualStartTime.getTime()) / 60000);
  }
  return null;
});

// Virtual for scheduled duration
TelemedicineSessionSchema.virtual('scheduledDuration').get(function() {
  return Math.round((this.scheduledEndTime.getTime() - this.scheduledStartTime.getTime()) / 60000);
});

export default mongoose.models.TelemedicineSession || 
  mongoose.model<ITelemedicineSession>('TelemedicineSession', TelemedicineSessionSchema);
