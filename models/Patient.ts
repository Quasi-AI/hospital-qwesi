import mongoose from 'mongoose';

export interface IPatient {
  _id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  insuranceProvider?: string;
  insuranceNumber?: string;
  assignedDoctor?: string;
  password?: string; // For patient login
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new mongoose.Schema<IPatient>(
  {
    patientId: {
      type: String,
      unique: true,
      required: false, // Will be auto-generated in pre-save hook
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      required: true,
    },
    address: {
      type: String,
      required: false,
      trim: true,
    },
    emergencyContact: {
      name: {
        type: String,
        required: false,
        trim: true,
      },
      phone: {
        type: String,
        required: false,
        trim: true,
      },
      relationship: {
        type: String,
        required: false,
        trim: true,
      },
    },
    medicalHistory: [{
      type: String,
      trim: true,
    }],
    allergies: [{
      type: String,
      trim: true,
    }],
    currentMedications: [{
      type: String,
      trim: true,
    }],
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    insuranceProvider: {
      type: String,
      trim: true,
    },
    insuranceNumber: {
      type: String,
      trim: true,
    },
    assignedDoctor: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate patient ID (fallback if not set in API)
patientSchema.pre('save', function() {
  // Only generate if patientId is not already set
  if (!this.patientId) {
    // Use timestamp-based ID as fallback
      this.patientId = `PAT-${Date.now().toString().slice(-6)}`;
  }
});

// Prevent multiple model initialization in development
export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', patientSchema);
