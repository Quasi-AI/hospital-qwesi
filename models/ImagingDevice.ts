import mongoose from 'mongoose';
import crypto from 'crypto';

// DICOM Modality types
export type DicomModality = 'CR' | 'CT' | 'MR' | 'US' | 'MG' | 'XA' | 'DX' | 'NM' | 'PT' | 'RF' | 'OT';

export const MODALITY_NAMES: Record<DicomModality, string> = {
  CR: 'Computed Radiography',
  CT: 'CT Scan',
  MR: 'MRI',
  US: 'Ultrasound',
  MG: 'Mammography',
  XA: 'X-Ray Angiography',
  DX: 'Digital X-Ray',
  NM: 'Nuclear Medicine',
  PT: 'PET Scan',
  RF: 'Fluoroscopy',
  OT: 'Other',
};

export interface IImagingDevice {
  _id: string;
  deviceCode: string;
  name: string;
  
  // DICOM Configuration
  aeTitle: string; // Application Entity Title
  
  // Device Profile
  profileId?: string;
  profileName?: string;
  isCustomProfile: boolean;
  
  // Device Info
  manufacturer: string;
  model: string;
  serialNumber?: string;
  modality: DicomModality;
  supportedModalities: DicomModality[];
  location: string;
  
  // Connection
  apiKeyHash: string;
  apiKeyPrefix: string;
  apiKeyGeneratedAt: Date;
  isActive: boolean;
  connectionStatus: 'online' | 'offline' | 'error';
  lastSeenAt?: Date;
  lastImageAt?: Date;
  lastError?: string;
  
  // Stats
  totalImagesReceived: number;
  imagesToday: number;
  totalStudiesReceived: number;
  lastResetDate: Date;
  
  // Metadata
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const imagingDeviceSchema = new mongoose.Schema<IImagingDevice>(
  {
    deviceCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    
    // DICOM Configuration
    aeTitle: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    
    // Device Profile
    profileId: {
      type: String,
      trim: true,
    },
    profileName: {
      type: String,
      trim: true,
    },
    isCustomProfile: {
      type: Boolean,
      default: false,
    },
    
    // Device Info
    manufacturer: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    modality: {
      type: String,
      enum: ['CR', 'CT', 'MR', 'US', 'MG', 'XA', 'DX', 'NM', 'PT', 'RF', 'OT'],
      required: true,
    },
    supportedModalities: [{
      type: String,
      enum: ['CR', 'CT', 'MR', 'US', 'MG', 'XA', 'DX', 'NM', 'PT', 'RF', 'OT'],
    }],
    location: {
      type: String,
      trim: true,
    },
    
    // Connection
    apiKeyHash: {
      type: String,
      required: true,
    },
    apiKeyPrefix: {
      type: String,
      required: true,
    },
    apiKeyGeneratedAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    connectionStatus: {
      type: String,
      enum: ['online', 'offline', 'error'],
      default: 'offline',
    },
    lastSeenAt: {
      type: Date,
    },
    lastImageAt: {
      type: Date,
    },
    lastError: {
      type: String,
      trim: true,
    },
    
    // Stats
    totalImagesReceived: {
      type: Number,
      default: 0,
    },
    imagesToday: {
      type: Number,
      default: 0,
    },
    totalStudiesReceived: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
    
    // Metadata
    notes: {
      type: String,
      trim: true,
    },
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

// Generate API key for imaging device
imagingDeviceSchema.statics.generateApiKey = function(): { apiKey: string; apiKeyHash: string; apiKeyPrefix: string } {
  // Generate a secure random API key with 'img_' prefix
  const randomBytes = crypto.randomBytes(32);
  const apiKey = `img_${randomBytes.toString('hex')}`;
  
  // Hash the API key for storage
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // Store prefix for display (first 11 chars)
  const apiKeyPrefix = apiKey.substring(0, 12) + '...';
  
  return { apiKey, apiKeyHash, apiKeyPrefix };
};

// Verify API key
imagingDeviceSchema.statics.verifyApiKey = function(apiKey: string, apiKeyHash: string): boolean {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  return hash === apiKeyHash;
};

// Update connection status based on last seen time
imagingDeviceSchema.methods.updateConnectionStatus = function() {
  if (!this.lastSeenAt) {
    this.connectionStatus = 'offline';
    return;
  }
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (this.lastSeenAt >= fiveMinutesAgo) {
    this.connectionStatus = 'online';
  } else {
    this.connectionStatus = 'offline';
  }
};

// Reset daily counter if needed
imagingDeviceSchema.methods.resetDailyCounterIfNeeded = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastReset = new Date(this.lastResetDate);
  lastReset.setHours(0, 0, 0, 0);
  
  if (today > lastReset) {
    this.imagesToday = 0;
    this.lastResetDate = new Date();
  }
};

// Indexes
imagingDeviceSchema.index({ deviceCode: 1 });
imagingDeviceSchema.index({ aeTitle: 1 });
imagingDeviceSchema.index({ apiKeyHash: 1 });
imagingDeviceSchema.index({ isActive: 1 });
imagingDeviceSchema.index({ manufacturer: 1 });
imagingDeviceSchema.index({ modality: 1 });
imagingDeviceSchema.index({ connectionStatus: 1 });

const ImagingDevice = mongoose.models.ImagingDevice || mongoose.model<IImagingDevice>('ImagingDevice', imagingDeviceSchema);

export default ImagingDevice;
