import mongoose from 'mongoose';

export interface IPublicBookingOtp {
  phoneKey: string;
  codeHash: string;
  patientId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const publicBookingOtpSchema = new mongoose.Schema<IPublicBookingOtp>(
  {
    phoneKey: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

publicBookingOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PublicBookingOtp ||
  mongoose.model<IPublicBookingOtp>('PublicBookingOtp', publicBookingOtpSchema);
