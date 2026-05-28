import mongoose from 'mongoose';

export type AppointmentSource = 'staff' | 'website' | 'patient_portal';

export interface IAppointment {
  _id: string;
  patientId?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId?: mongoose.Types.ObjectId;
  doctorName: string;
  doctorEmail?: string;
  /** How the appointment was created */
  source?: AppointmentSource;
  appointmentDate: Date;
  appointmentTime: string;
  appointmentType: 'consultation' | 'follow-up' | 'followUp' | 'checkup' | 'emergency' | 'surgery' | 'therapy' | 'telemedicine' | 'home-nurse-visit';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'inProgress' | 'completed' | 'cancelled';
  location?: string;
  reason?: string;
  notes?: string;
  symptoms?: string[];
  diagnosis?: string;
  treatment?: string;
  telemedicineSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new mongoose.Schema<IAppointment>(
  {
    patientId: {
      type: String,
      required: false,
      trim: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    patientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    doctorEmail: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    source: {
      type: String,
      enum: ['staff', 'website', 'patient_portal'],
      default: 'staff',
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
    },
    appointmentType: {
      type: String,
      enum: ['consultation', 'follow-up', 'followUp', 'checkup', 'emergency', 'surgery', 'therapy', 'telemedicine', 'home-nurse-visit'],
      default: 'consultation',
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in-progress', 'inProgress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    location: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    symptoms: [{
      type: String,
      trim: true,
    }],
    diagnosis: {
      type: String,
      trim: true,
    },
    treatment: {
      type: String,
      trim: true,
    },
    telemedicineSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TelemedicineSession',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple model initialization in development
export default mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', appointmentSchema);
