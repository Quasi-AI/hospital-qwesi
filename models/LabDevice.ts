import mongoose from 'mongoose';
import crypto from 'crypto';

export interface IParameterMapping {
  deviceCode: string;
  testName: string;
  unit: string;
  normalRange: string;
  criticalLow?: string;
  criticalHigh?: string;
}

export interface ILabDevice {
  _id: string;
  deviceCode: string;
  name: string;
  
  // Device Profile
  profileId?: string;
  profileName?: string;
  isCustomProfile: boolean;
  
  // Device Info
  manufacturer: string;
  model: string;
  serialNumber?: string;
  category: 'hematology' | 'biochemistry' | 'immunology' | 'urinalysis' | 'coagulation' | 'bloodgas' | 'electrolyte' | 'esr' | 'hba1c' | 'microbiology' | 'poc' | 'other';
  location: string;
  
  // Protocol Configuration
  protocolType: 'REST' | 'HL7' | 'ASTM' | 'FHIR';
  hl7SendingApp?: string;  // For HL7: Sending Application identifier
  hl7SendingFacility?: string; // For HL7: Sending Facility identifier
  astmSenderId?: string; // For ASTM: Sender name/ID from header
  
  // Connection
  apiKey: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  apiKeyGeneratedAt: Date;
  isActive: boolean;
  connectionStatus: 'online' | 'offline' | 'error';
  lastSeenAt?: Date;
  lastResultAt?: Date;
  lastError?: string;
  
  // Parameter Mappings
  parameterMappings: IParameterMapping[];
  
  // Stats
  totalResultsReceived: number;
  resultsToday: number;
  lastResetDate: Date;
  
  // Metadata
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const parameterMappingSchema = new mongoose.Schema({
  deviceCode: {
    type: String,
    required: true,
    trim: true,
  },
  testName: {
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
  criticalLow: {
    type: String,
    trim: true,
  },
  criticalHigh: {
    type: String,
    trim: true,
  },
});

const labDeviceSchema = new mongoose.Schema<ILabDevice>(
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
    category: {
      type: String,
      enum: ['hematology', 'biochemistry', 'immunology', 'urinalysis', 'coagulation', 'bloodgas', 'electrolyte', 'esr', 'hba1c', 'microbiology', 'poc', 'other'],
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    
    // Protocol Configuration
    protocolType: {
      type: String,
      enum: ['REST', 'HL7', 'ASTM', 'FHIR'],
      default: 'REST',
    },
    hl7SendingApp: {
      type: String,
      trim: true,
    },
    hl7SendingFacility: {
      type: String,
      trim: true,
    },
    astmSenderId: {
      type: String,
      trim: true,
    },
    
    // Connection
    apiKey: {
      type: String,
      select: false, // Don't include in queries by default
    },
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
    lastResultAt: {
      type: Date,
    },
    lastError: {
      type: String,
      trim: true,
    },
    
    // Parameter Mappings
    parameterMappings: [parameterMappingSchema],
    
    // Stats
    totalResultsReceived: {
      type: Number,
      default: 0,
    },
    resultsToday: {
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

// Generate API key
labDeviceSchema.statics.generateApiKey = function(): { apiKey: string; apiKeyHash: string; apiKeyPrefix: string } {
  // Generate a secure random API key
  const randomBytes = crypto.randomBytes(32);
  const apiKey = `dk_${randomBytes.toString('hex')}`;
  
  // Hash the API key for storage
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // Store prefix for display (first 8 chars after dk_)
  const apiKeyPrefix = apiKey.substring(0, 11) + '...';
  
  return { apiKey, apiKeyHash, apiKeyPrefix };
};

// Verify API key
labDeviceSchema.statics.verifyApiKey = function(apiKey: string, apiKeyHash: string): boolean {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  return hash === apiKeyHash;
};

// Update connection status based on last seen time
labDeviceSchema.methods.updateConnectionStatus = function() {
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
labDeviceSchema.methods.resetDailyCounterIfNeeded = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastReset = new Date(this.lastResetDate);
  lastReset.setHours(0, 0, 0, 0);
  
  if (today > lastReset) {
    this.resultsToday = 0;
    this.lastResetDate = new Date();
  }
};

// Indexes
labDeviceSchema.index({ deviceCode: 1 });
labDeviceSchema.index({ apiKeyHash: 1 });
labDeviceSchema.index({ isActive: 1 });
labDeviceSchema.index({ manufacturer: 1 });
labDeviceSchema.index({ category: 1 });
labDeviceSchema.index({ connectionStatus: 1 });
labDeviceSchema.index({ protocolType: 1 });
labDeviceSchema.index({ hl7SendingApp: 1, hl7SendingFacility: 1 });
labDeviceSchema.index({ astmSenderId: 1 });

const LabDevice = mongoose.models.LabDevice || mongoose.model<ILabDevice>('LabDevice', labDeviceSchema);

export default LabDevice;
