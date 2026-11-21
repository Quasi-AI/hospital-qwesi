import mongoose from 'mongoose';

export interface IWallet {
  _id: string;
  ownerId: string;
  ownerRole: 'doctor' | 'staff';
  ownerName: string;
  ownerEmail: string;
  currency: string;
  /** Earned but not yet withdrawable: waiting for the consultation to finish + the safety window. */
  heldBalance: number;
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  lifetimeCommission: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new mongoose.Schema<IWallet>(
  {
    ownerId: { type: String, required: true, unique: true, trim: true },
    ownerRole: { type: String, enum: ['doctor', 'staff'], required: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    currency: { type: String, default: 'GHS' },
    heldBalance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    lifetimeEarnings: { type: Number, default: 0, min: 0 },
    lifetimeCommission: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', walletSchema);
