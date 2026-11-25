import mongoose from 'mongoose';
import { safeTimeZone, zonedToInstant, ymdOf } from '@/lib/timezone';

export type AppointmentSource = 'staff' | 'website' | 'patient_portal';

export interface IAppointment {
  missedNoticeSentAt?: Date;
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
  /** Zone the doctor's clock time is in (appointmentDate/appointmentTime are written in it) */
  doctorTimeZone?: string;
  /** The exact UTC moment the appointment starts */
  startAt?: Date;
  appointmentType: 'consultation' | 'follow-up' | 'followUp' | 'checkup' | 'emergency' | 'surgery' | 'therapy' | 'telemedicine' | 'home-nurse-visit';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'inProgress' | 'completed' | 'cancelled';
  location?: string;
  reason?: string;
  notes?: string;
  consentAgreement?: { accepted: boolean; signedName: string; signedAt: Date; version: string; channel: string };
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
    doctorTimeZone: { type: String, trim: true },
    startAt: { type: Date },
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
    // Signed telemedicine consent captured at booking
    consentAgreement: {
      accepted: { type: Boolean },
      signedName: { type: String, trim: true },
      signedAt: { type: Date },
      version: { type: String },
      channel: { type: String },
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
      missedNoticeSentAt: { type: Date }, // provider/patient emailed about a missed consultation
},
  {
    timestamps: true,
  }
);

// Stamp the doctor's time zone and the exact start moment whenever an appointment is saved.
appointmentSchema.pre('validate', async function () {
  try {
    const doc: any = this;
    if (!doc.doctorTimeZone) {
      let tz: string | undefined;
      const User = mongoose.models.User;
      if (User && (doc.doctorId || doc.doctorEmail)) {
        const d: any = await User.findOne(doc.doctorId ? { _id: doc.doctorId } : { email: String(doc.doctorEmail).toLowerCase() }).select('timeZone').lean();
        tz = d?.timeZone;
      }
      doc.doctorTimeZone = safeTimeZone(tz);
    }
    if (doc.appointmentDate && doc.appointmentTime) {
      const at = zonedToInstant(ymdOf(doc.appointmentDate), doc.appointmentTime, doc.doctorTimeZone);
      if (!Number.isNaN(at.getTime())) doc.startAt = at;
    }
  } catch { /* never block saving an appointment because of the zone stamp */ }
});

// Indexes: doctor/patient dashboards and lists filter on these fields (there were none, so every request scanned the collection)
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ doctorEmail: 1, appointmentDate: 1 });
appointmentSchema.index({ doctorName: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ patientEmail: 1 });
appointmentSchema.index({ appointmentDate: 1, status: 1 });
appointmentSchema.index({ createdAt: -1 });

// Prevent multiple model initialization in development
export default mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', appointmentSchema);
