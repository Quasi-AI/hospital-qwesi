import mongoose from 'mongoose';

export interface IUser {
  _id: string;
  email: string;
  name: string;
  password?: string;
  role: 'doctor' | 'admin' | 'staff' | 'nurse' | 'patient' | 'pharmacy' | 'hospital';
  image?: string;
  emailVerified?: Date;
  hasImage?: boolean;
  approvalStatus?: 'pending_profile' | 'pending_verification' | 'approved' | 'rejected';
  approvalMethod?: 'manual' | 'official_api' | 'legacy';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  // Doctor/Staff specific fields
  phone?: string;
  specialization?: string;
  department?: string;
  licenseNumber?: string;
  licenseCertificate?: {
    fileName?: string;
    fileType?: string;
    data?: string;
    uploadedAt?: Date;
  };
  licenseVerification?: {
    status?: 'not_started' | 'pending' | 'verified' | 'failed' | 'manual_review';
    method?: 'official_api' | 'manual';
    checkedAt?: Date;
    message?: string;
    reference?: string;
  };
  qualifications?: string[];
  languages?: string[];
  yearsOfExperience?: number;
  rating?: number;
  ratingCount?: number;
  agreement?: {
    version?: string;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
    healthConsentAccepted?: boolean;
    telemedicineConsentAccepted?: boolean;
    signedName?: string;
    signedAt?: Date;
    userAgent?: string;
  };
  bio?: string;
  address?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ['doctor', 'admin', 'staff', 'nurse', 'patient', 'pharmacy', 'hospital'],
      default: 'doctor',
    },
    image: {
      type: String,
    },
    emailVerified: {
      type: Date,
    },
    hasImage: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending_profile', 'pending_verification', 'approved', 'rejected'],
      default: 'pending_profile',
    },
    approvalMethod: {
      type: String,
      enum: ['manual', 'official_api', 'legacy'],
    },
    approvedBy: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    // Doctor/Staff specific fields
    phone: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    licenseCertificate: {
      fileName: { type: String, trim: true },
      fileType: { type: String, trim: true },
      data: { type: String },
      uploadedAt: { type: Date },
    },
    licenseVerification: {
      status: {
        type: String,
        enum: ['not_started', 'pending', 'verified', 'failed', 'manual_review'],
        default: 'not_started',
      },
      method: {
        type: String,
        enum: ['official_api', 'manual'],
      },
      checkedAt: { type: Date },
      message: { type: String, trim: true },
      reference: { type: String, trim: true },
    },
    qualifications: [{
      type: String,
      trim: true,
    }],
    languages: [{
      type: String,
      trim: true,
    }],
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    agreement: {
      version: { type: String, trim: true },
      termsAccepted: { type: Boolean, default: false },
      privacyAccepted: { type: Boolean, default: false },
      healthConsentAccepted: { type: Boolean, default: false },
      telemedicineConsentAccepted: { type: Boolean, default: false },
      signedName: { type: String, trim: true },
      signedAt: { type: Date },
      userAgent: { type: String, trim: true },
    },
    bio: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple model initialization in development
export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
