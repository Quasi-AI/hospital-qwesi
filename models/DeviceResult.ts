import mongoose from 'mongoose';

export interface IDeviceResultParameter {
  parameterCode: string;
  parameterName: string;
  value: string;
  unit: string;
  normalRange: string;
  flag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high';
  rawValue?: string;
}

export interface IDeviceResult {
  _id: string;
  resultNumber: string;
  
  // Source Device
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  receivedAt: Date;
  analyzedAt?: Date;
  
  // Sample Identification
  sampleId: string;
  patientId?: string;
  patientName?: string;
  
  // Auto-Matching
  matchedLabTestId?: string;
  matchedTestNumber?: string;
  matchStatus: 'matched' | 'unmatched' | 'multiple' | 'manual';
  matchConfidence: number;
  possibleMatches?: {
    labTestId: string;
    testNumber: string;
    patientName: string;
    testType: string;
    confidence: number;
  }[];
  
  // Results
  results: IDeviceResultParameter[];
  
  // Workflow Status
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: Date;
  appliedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  
  // Flags
  hasCriticalValues: boolean;
  requiresAttention: boolean;
  
  // Raw Data (for debugging/audit)
  rawPayload?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const deviceResultParameterSchema = new mongoose.Schema({
  parameterCode: {
    type: String,
    required: true,
    trim: true,
  },
  parameterName: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
  unit: {
    type: String,
    trim: true,
  },
  normalRange: {
    type: String,
    trim: true,
  },
  flag: {
    type: String,
    enum: ['normal', 'low', 'high', 'critical-low', 'critical-high'],
    default: 'normal',
  },
  rawValue: {
    type: String,
    trim: true,
  },
});

const possibleMatchSchema = new mongoose.Schema({
  labTestId: {
    type: String,
    required: true,
  },
  testNumber: {
    type: String,
    required: true,
  },
  patientName: {
    type: String,
  },
  testType: {
    type: String,
  },
  confidence: {
    type: Number,
    default: 0,
  },
});

const deviceResultSchema = new mongoose.Schema<IDeviceResult>(
  {
    resultNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    
    // Source Device
    deviceId: {
      type: String,
      required: true,
      ref: 'LabDevice',
    },
    deviceCode: {
      type: String,
      required: true,
      trim: true,
    },
    deviceName: {
      type: String,
      required: true,
      trim: true,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    analyzedAt: {
      type: Date,
    },
    
    // Sample Identification
    sampleId: {
      type: String,
      required: true,
      trim: true,
    },
    patientId: {
      type: String,
      trim: true,
    },
    patientName: {
      type: String,
      trim: true,
    },
    
    // Auto-Matching
    matchedLabTestId: {
      type: String,
      ref: 'LabTest',
    },
    matchedTestNumber: {
      type: String,
      trim: true,
    },
    matchStatus: {
      type: String,
      enum: ['matched', 'unmatched', 'multiple', 'manual'],
      default: 'unmatched',
    },
    matchConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    possibleMatches: [possibleMatchSchema],
    
    // Results
    results: [deviceResultParameterSchema],
    
    // Workflow Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'applied'],
      default: 'pending',
    },
    reviewedBy: {
      type: String,
      ref: 'User',
    },
    reviewerName: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    appliedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    
    // Flags
    hasCriticalValues: {
      type: Boolean,
      default: false,
    },
    requiresAttention: {
      type: Boolean,
      default: false,
    },
    
    // Raw Data
    rawPayload: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Generate result number before saving
deviceResultSchema.pre('save', async function() {
  if (this.isNew && !this.resultNumber) {
    const count = await mongoose.models.DeviceResult?.countDocuments() || 0;
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    this.resultNumber = `DR-${year}${month}${day}-${(count + 1).toString().padStart(5, '0')}`;
  }
  
  // Check for critical values
  if (this.results && this.results.length > 0) {
    this.hasCriticalValues = this.results.some(r => 
      r.flag === 'critical-low' || r.flag === 'critical-high'
    );
    
    // Requires attention if critical values or unmatched
    this.requiresAttention = this.hasCriticalValues || 
      this.matchStatus === 'unmatched' || 
      this.matchStatus === 'multiple';
  }
});

// Indexes
deviceResultSchema.index({ deviceId: 1, receivedAt: -1 });
deviceResultSchema.index({ sampleId: 1 });
deviceResultSchema.index({ status: 1 });
deviceResultSchema.index({ matchStatus: 1 });
deviceResultSchema.index({ hasCriticalValues: 1 });
deviceResultSchema.index({ requiresAttention: 1 });
deviceResultSchema.index({ receivedAt: -1 });
deviceResultSchema.index({ matchedLabTestId: 1 });

const DeviceResult = mongoose.models.DeviceResult || mongoose.model<IDeviceResult>('DeviceResult', deviceResultSchema);

export default DeviceResult;
