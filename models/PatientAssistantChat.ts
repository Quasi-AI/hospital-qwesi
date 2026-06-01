import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export type PatientAssistantChatRole = 'assistant' | 'user';

export interface IPatientAssistantChatMessage {
  role: PatientAssistantChatRole;
  content: string;
  doctors?: {
    id: string;
    name: string;
    specialization: string;
    reason: string;
  }[];
  createdAt: Date;
}

export interface IPatientAssistantChat extends MongoDocument {
  patientId: mongoose.Types.ObjectId;
  messages: IPatientAssistantChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const RecommendedDoctorSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    specialization: { type: String, default: 'Doctor', trim: true },
    reason: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const PatientAssistantChatMessageSchema = new Schema<IPatientAssistantChatMessage>(
  {
    role: { type: String, enum: ['assistant', 'user'], required: true },
    content: { type: String, required: true, trim: true },
    doctors: { type: [RecommendedDoctorSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const PatientAssistantChatSchema = new Schema<IPatientAssistantChat>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, unique: true, index: true },
    messages: { type: [PatientAssistantChatMessageSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.PatientAssistantChat ||
  mongoose.model<IPatientAssistantChat>('PatientAssistantChat', PatientAssistantChatSchema);
