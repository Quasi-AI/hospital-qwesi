import mongoose from 'mongoose';

export interface IIncomingImage {
  _id: string;
  imageNumber: string; // Auto-generated "IMG-YYYYMMDD-#####"
  
  // Source Device
  deviceId: mongoose.Types.ObjectId;
  deviceCode: string;
  deviceName: string;
  receivedAt: Date;
  
  // DICOM Metadata
  patientId?: string;
  patientName?: string;
  patientBirthDate?: Date;
  patientSex?: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  accessionNumber?: string;
  modality: string;
  studyDate?: Date;
  studyTime?: string;
  studyDescription?: string;
  seriesDescription?: string;
  seriesNumber?: number;
  instanceNumber?: number;
  bodyPartExamined?: string;
  
  // Image Details
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  photometricInterpretation?: string;
  windowCenter?: number;
  windowWidth?: number;
  
  // File Storage
  filePath: string;
  fileSize: number;
  thumbnailPath?: string;
  
  // Series Grouping (for multi-image series)
  studyGroupId?: string; // Groups all images from same study
  seriesGroupId?: string; // Groups all images from same series
  totalImagesInSeries?: number;
  
  // Auto-Matching
  matchedStudyId?: mongoose.Types.ObjectId;
  matchedStudyNumber?: string;
  matchStatus: 'matched' | 'unmatched' | 'multiple' | 'manual';
  matchConfidence: number;
  possibleMatches?: {
    studyId: string;
    studyNumber: string;
    patientName: string;
    studyType: string;
    confidence: number;
  }[];
  
  // Workflow
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  reviewedBy?: string;
  reviewedAt?: Date;
  appliedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  
  // Flags
  requiresAttention: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const incomingImageSchema = new mongoose.Schema<IIncomingImage>(
  {
    imageNumber: {
      type: String,
      unique: true,
    },
    
    // Source Device
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImagingDevice',
      required: true,
    },
    deviceCode: {
      type: String,
      required: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    
    // DICOM Metadata
    patientId: {
      type: String,
      trim: true,
    },
    patientName: {
      type: String,
      trim: true,
    },
    patientBirthDate: {
      type: Date,
    },
    patientSex: {
      type: String,
      trim: true,
    },
    studyInstanceUID: {
      type: String,
      required: true,
      trim: true,
    },
    seriesInstanceUID: {
      type: String,
      required: true,
      trim: true,
    },
    sopInstanceUID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accessionNumber: {
      type: String,
      trim: true,
    },
    modality: {
      type: String,
      required: true,
      trim: true,
    },
    studyDate: {
      type: Date,
    },
    studyTime: {
      type: String,
      trim: true,
    },
    studyDescription: {
      type: String,
      trim: true,
    },
    seriesDescription: {
      type: String,
      trim: true,
    },
    seriesNumber: {
      type: Number,
    },
    instanceNumber: {
      type: Number,
    },
    bodyPartExamined: {
      type: String,
      trim: true,
    },
    
    // Image Details
    rows: {
      type: Number,
    },
    columns: {
      type: Number,
    },
    bitsAllocated: {
      type: Number,
    },
    photometricInterpretation: {
      type: String,
      trim: true,
    },
    windowCenter: {
      type: Number,
    },
    windowWidth: {
      type: Number,
    },
    
    // File Storage
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    thumbnailPath: {
      type: String,
    },
    
    // Series Grouping
    studyGroupId: {
      type: String,
    },
    seriesGroupId: {
      type: String,
    },
    totalImagesInSeries: {
      type: Number,
    },
    
    // Auto-Matching
    matchedStudyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RadiologyStudy',
    },
    matchedStudyNumber: {
      type: String,
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
    possibleMatches: [{
      studyId: String,
      studyNumber: String,
      patientName: String,
      studyType: String,
      confidence: Number,
    }],
    
    // Workflow
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'applied'],
      default: 'pending',
    },
    reviewedBy: {
      type: String,
      ref: 'User',
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
    requiresAttention: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate image number before saving
incomingImageSchema.pre('save', async function() {
  if (this.isNew && !this.imageNumber) {
    const count = await mongoose.models.IncomingImage?.countDocuments() || 0;
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    this.imageNumber = `IMG-${year}${month}${day}-${(count + 1).toString().padStart(5, '0')}`;
  }
  
  // Set requiresAttention flag
  if (this.matchStatus === 'unmatched' || this.matchStatus === 'multiple') {
    this.requiresAttention = true;
  }
  
  // Set study and series group IDs for easier grouping
  if (!this.studyGroupId) {
    this.studyGroupId = this.studyInstanceUID;
  }
  if (!this.seriesGroupId) {
    this.seriesGroupId = `${this.studyInstanceUID}-${this.seriesInstanceUID}`;
  }
});

// Indexes
incomingImageSchema.index({ deviceId: 1 });
incomingImageSchema.index({ deviceCode: 1 });
incomingImageSchema.index({ studyInstanceUID: 1 });
incomingImageSchema.index({ seriesInstanceUID: 1 });
incomingImageSchema.index({ accessionNumber: 1 });
incomingImageSchema.index({ patientId: 1 });
incomingImageSchema.index({ matchedStudyId: 1 });
incomingImageSchema.index({ matchStatus: 1 });
incomingImageSchema.index({ status: 1 });
incomingImageSchema.index({ receivedAt: -1 });
incomingImageSchema.index({ modality: 1 });
incomingImageSchema.index({ studyGroupId: 1 });
incomingImageSchema.index({ seriesGroupId: 1 });

const IncomingImage = mongoose.models.IncomingImage || mongoose.model<IIncomingImage>('IncomingImage', incomingImageSchema);

export default IncomingImage;
