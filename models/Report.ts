import mongoose from 'mongoose';

export interface IReport {
  _id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  reportType: 'lab' | 'imaging' | 'diagnostic' | 'treatment' | 'follow-up';
  reportDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'reviewed';
  findings: string;
  diagnosis: string;
  recommendations: string;
  attachments?: string[];
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new mongoose.Schema<IReport>(
  {
    patientId: {
      type: String,
      required: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    reportType: {
      type: String,
      enum: ['lab', 'imaging', 'diagnostic', 'treatment', 'follow-up'],
      required: true,
    },
    reportDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'reviewed'],
      default: 'pending',
    },
    findings: {
      type: String,
      required: true,
      trim: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    recommendations: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple model initialization in development
export default mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema);
