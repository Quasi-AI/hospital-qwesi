import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export interface IClinicalNote extends MongoDocument {
  noteNumber: string;
  patientId: mongoose.Types.ObjectId;
  patientName: string;
  patientDisplayId?: string;
  encounterDate: Date;
  encounterType: 'phone' | 'whatsapp' | 'video' | 'home-visit' | 'facility-visit' | 'in-person' | 'other';
  noteType: 'full-soap' | 'nurse-triage' | 'doctor-telemedicine' | 'home-visit-follow-up';
  providerId: mongoose.Types.ObjectId;
  providerName: string;
  providerRole: 'doctor' | 'nurse' | 'staff' | 'specialist' | 'care-coordinator' | 'admin';
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  redFlags: {
    chestPain?: boolean;
    difficultyBreathing?: boolean;
    severeBleeding?: boolean;
    lossOfConsciousness?: boolean;
    seizure?: boolean;
    strokeSymptoms?: boolean;
    pregnancyBleeding?: boolean;
    severeAbdominalPain?: boolean;
    suicidalThoughts?: boolean;
    severeDehydration?: boolean;
    majorTrauma?: boolean;
    other?: string;
  };
  triageLevel: 'green' | 'yellow' | 'orange' | 'red';
  followUpPlan: string;
  emergencyPrecautions: string;
  patientUnderstanding: boolean;
  consentForVirtualCare: boolean;
  sharedWith: mongoose.Types.ObjectId[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicalNoteSchema = new Schema<IClinicalNote>(
  {
    noteNumber: { type: String, unique: true, required: true, trim: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientName: { type: String, required: true, trim: true },
    patientDisplayId: { type: String, trim: true },
    encounterDate: { type: Date, required: true, default: Date.now },
    encounterType: {
      type: String,
      enum: ['phone', 'whatsapp', 'video', 'home-visit', 'facility-visit', 'in-person', 'other'],
      default: 'video',
    },
    noteType: {
      type: String,
      enum: ['full-soap', 'nurse-triage', 'doctor-telemedicine', 'home-visit-follow-up'],
      default: 'full-soap',
    },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerName: { type: String, required: true, trim: true },
    providerRole: {
      type: String,
      enum: ['doctor', 'nurse', 'staff', 'specialist', 'care-coordinator', 'admin'],
      default: 'doctor',
    },
    chiefComplaint: { type: String, required: true, trim: true },
    subjective: { type: String, default: '', trim: true },
    objective: { type: String, default: '', trim: true },
    assessment: { type: String, default: '', trim: true },
    plan: { type: String, default: '', trim: true },
    redFlags: {
      chestPain: { type: Boolean, default: false },
      difficultyBreathing: { type: Boolean, default: false },
      severeBleeding: { type: Boolean, default: false },
      lossOfConsciousness: { type: Boolean, default: false },
      seizure: { type: Boolean, default: false },
      strokeSymptoms: { type: Boolean, default: false },
      pregnancyBleeding: { type: Boolean, default: false },
      severeAbdominalPain: { type: Boolean, default: false },
      suicidalThoughts: { type: Boolean, default: false },
      severeDehydration: { type: Boolean, default: false },
      majorTrauma: { type: Boolean, default: false },
      other: { type: String, default: '', trim: true },
    },
    triageLevel: { type: String, enum: ['green', 'yellow', 'orange', 'red'], default: 'green' },
    followUpPlan: { type: String, default: '', trim: true },
    emergencyPrecautions: { type: String, default: '', trim: true },
    patientUnderstanding: { type: Boolean, default: false },
    consentForVirtualCare: { type: Boolean, default: false },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ClinicalNoteSchema.pre('validate', async function() {
  if (this.isNew && !this.noteNumber) {
    const date = new Date();
    const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('ClinicalNote').countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
    });
    this.noteNumber = `SOAP-${stamp}-${String(count + 1).padStart(4, '0')}`;
  }
});

ClinicalNoteSchema.index({ patientId: 1, createdAt: -1 });
ClinicalNoteSchema.index({ providerId: 1, createdAt: -1 });
ClinicalNoteSchema.index({ sharedWith: 1 });

export default mongoose.models.ClinicalNote ||
  mongoose.model<IClinicalNote>('ClinicalNote', ClinicalNoteSchema);
