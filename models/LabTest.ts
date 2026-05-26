import mongoose from 'mongoose';

export interface ILabTestResult {
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  notes?: string;
}

export interface ILabTest {
  _id: string;
  testNumber: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  testType: string;
  testCategory: 'hematology' | 'biochemistry' | 'microbiology' | 'immunology' | 'pathology' | 'urinalysis' | 'other';
  tests: string[]; // List of individual tests to be performed
  sampleType: string; // Blood, Urine, Stool, etc.
  sampleCollectedAt?: Date;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'sample-collected' | 'in-progress' | 'completed' | 'cancelled';
  assignedTechnician?: string;
  technicianName?: string;
  results: ILabTestResult[];
  resultNotes?: string;
  isCritical: boolean;
  criticalNotified: boolean;
  completedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  attachments?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const labTestResultSchema = new mongoose.Schema({
  testName: {
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
  status: {
    type: String,
    enum: ['normal', 'abnormal', 'critical'],
    default: 'normal',
  },
  notes: {
    type: String,
    trim: true,
  },
});

const labTestSchema = new mongoose.Schema<ILabTest>(
  {
    testNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    patientId: {
      type: String,
      required: true,
      ref: 'Patient',
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientEmail: {
      type: String,
      trim: true,
    },
    patientPhone: {
      type: String,
      trim: true,
    },
    doctorId: {
      type: String,
      required: true,
      ref: 'User',
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    testType: {
      type: String,
      required: true,
      trim: true,
    },
    testCategory: {
      type: String,
      enum: ['hematology', 'biochemistry', 'microbiology', 'immunology', 'pathology', 'urinalysis', 'other'],
      default: 'other',
    },
    tests: [{
      type: String,
      trim: true,
    }],
    sampleType: {
      type: String,
      trim: true,
    },
    sampleCollectedAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'stat'],
      default: 'routine',
    },
    status: {
      type: String,
      enum: ['pending', 'sample-collected', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    assignedTechnician: {
      type: String,
      ref: 'User',
    },
    technicianName: {
      type: String,
      trim: true,
    },
    results: [labTestResultSchema],
    resultNotes: {
      type: String,
      trim: true,
    },
    isCritical: {
      type: Boolean,
      default: false,
    },
    criticalNotified: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    reviewedBy: {
      type: String,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    attachments: [{
      type: String,
    }],
    createdBy: {
      type: String,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Generate test number before saving
labTestSchema.pre('save', async function () {
  if (!this.testNumber) {
    const count = await mongoose.models.LabTest?.countDocuments() || 0;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequence = String(count + 1).padStart(5, '0');
    this.testNumber = `LAB-${year}${month}${day}-${sequence}`;
  }
});

// Index for efficient queries
labTestSchema.index({ patientId: 1, createdAt: -1 });
labTestSchema.index({ status: 1 });
labTestSchema.index({ priority: 1 });

const LabTest = mongoose.models.LabTest || mongoose.model<ILabTest>('LabTest', labTestSchema);

export default LabTest;
