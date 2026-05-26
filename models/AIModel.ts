import mongoose from 'mongoose';

export interface IAIModel {
  id: string;
  name: string;
  provider: string;
  type: 'llm' | 'vision' | 'speech' | 'multimodal';
  status: 'active' | 'inactive' | 'testing';
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
  accuracy: number;
  speed: number;
  cost: number;
  features: string[];
  lastTest: string;
  testResults: {
    accuracy: number;
    responseTime: number;
    reliability: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const aiModelSchema = new mongoose.Schema<IAIModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['llm', 'vision', 'speech', 'multimodal'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'testing'],
      default: 'inactive',
    },
    apiKey: {
      type: String,
      required: true,
      trim: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    maxTokens: {
      type: Number,
      required: true,
      default: 4000,
    },
    temperature: {
      type: Number,
      required: true,
      default: 0.3,
    },
    accuracy: {
      type: Number,
      required: true,
      default: 90,
    },
    speed: {
      type: Number,
      required: true,
      default: 80,
    },
    cost: {
      type: Number,
      required: true,
      default: 0.03,
    },
    features: [{
      type: String,
      trim: true,
    }],
    lastTest: {
      type: String,
      default: new Date().toLocaleString(),
    },
    testResults: {
      accuracy: {
        type: Number,
        default: 90,
      },
      responseTime: {
        type: Number,
        default: 2.0,
      },
      reliability: {
        type: Number,
        default: 90,
      },
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one model can be active at a time
aiModelSchema.pre('save', async function() {
  if (this.isActive) {
    // Set all other models to inactive
    const AIModel = mongoose.models.AIModel;
    if (AIModel) {
      await AIModel.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  }
});

export default mongoose.models.AIModel || mongoose.model<IAIModel>('AIModel', aiModelSchema);
