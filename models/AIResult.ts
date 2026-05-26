import mongoose from 'mongoose';

export interface IAIResult {
  _id: string;
  patientId: string;
  type: 'treatment-plan' | 'drug-interaction' | 'image-analysis' | 'appointment-optimizer' | 'risk-assessment' | 'symptom-analysis' | 'prescription' | 'voice-transcription';
  title: string;
  content: string;
  rawData?: any;
  aiModel?: {
    id: string;
    name: string;
    provider: string;
  };
  metadata?: {
    symptoms?: string[];
    diagnosis?: string;
    medications?: string[];
    imageType?: string;
    appointmentPreferences?: any;
    riskFactors?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const aiResultSchema = new mongoose.Schema<IAIResult>(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['treatment-plan', 'drug-interaction', 'image-analysis', 'appointment-optimizer', 'risk-assessment', 'symptom-analysis', 'prescription', 'voice-transcription'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
    },
    aiModel: {
      id: String,
      name: String,
      provider: String,
    },
    metadata: {
      symptoms: [String],
      diagnosis: String,
      medications: [String],
      imageType: String,
      appointmentPreferences: mongoose.Schema.Types.Mixed,
      riskFactors: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
aiResultSchema.index({ patientId: 1, type: 1, createdAt: -1 });

export default mongoose.models.AIResult || mongoose.model<IAIResult>('AIResult', aiResultSchema);

