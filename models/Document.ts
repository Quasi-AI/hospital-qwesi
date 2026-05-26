import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export interface IDocumentVersion {
  versionNumber: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileData: string; // Base64 encoded file
  uploadedAt: Date;
  uploadedBy: string;
  notes?: string;
}

export interface IDocument extends MongoDocument {
  documentNumber: string;
  title: string;
  description?: string;
  category: 'consent-form' | 'legal-document' | 'medical-certificate' | 'insurance' | 'identification' | 'referral' | 'discharge-summary' | 'prescription' | 'lab-report' | 'imaging-report' | 'other';
  patientId?: mongoose.Schema.Types.ObjectId;
  patientName?: string;
  doctorId?: mongoose.Schema.Types.ObjectId;
  doctorName?: string;
  status: 'draft' | 'active' | 'archived' | 'expired';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiryDate?: Date;
  tags: string[];
  accessControl: {
    isPublic: boolean;
    allowedRoles: ('admin' | 'doctor' | 'staff' | 'patient')[];
    allowedUsers: string[];
  };
  currentVersion: number;
  versions: IDocumentVersion[];
  relatedDocuments: mongoose.Schema.Types.ObjectId[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentVersionSchema: Schema = new Schema({
  versionNumber: { type: Number, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  fileData: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  notes: { type: String },
});

const DocumentSchema: Schema = new Schema(
  {
    documentNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['consent-form', 'legal-document', 'medical-certificate', 'insurance', 'identification', 'referral', 'discharge-summary', 'prescription', 'lab-report', 'imaging-report', 'other'],
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    patientName: {
      type: String,
      trim: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    doctorName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'expired'],
      default: 'active',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    expiryDate: {
      type: Date,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    accessControl: {
      isPublic: { type: Boolean, default: false },
      allowedRoles: [{
        type: String,
        enum: ['admin', 'doctor', 'staff', 'patient'],
      }],
      allowedUsers: [{
        type: String,
      }],
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    versions: [DocumentVersionSchema],
    relatedDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    }],
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Generate document number before saving
DocumentSchema.pre('save', async function() {
  if (this.isNew && !this.documentNumber) {
    const count = await mongoose.model('Document').countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    this.documentNumber = `DOC-${year}${month}-${(count + 1).toString().padStart(5, '0')}`;
  }
});

// Index for efficient searching
DocumentSchema.index({ title: 'text', description: 'text', tags: 'text' });
DocumentSchema.index({ patientId: 1 });
DocumentSchema.index({ category: 1 });
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ createdAt: -1 });

// Clear model cache to ensure schema changes are picked up
if (mongoose.models.Document) {
  delete mongoose.models.Document;
}

const Document = mongoose.model<IDocument>('Document', DocumentSchema);

export default Document;
