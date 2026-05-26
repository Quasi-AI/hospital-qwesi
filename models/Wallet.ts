import mongoose from 'mongoose';

export interface IWallet {
  _id: string;
  ownerId: string;
  ownerRole: 'doctor' | 'staff';
  ownerName: string;
  ownerEmail: string;
  currency: 'GHS';
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new mongoose.Schema<IWallet>(
  {
    ownerId: { type: String, required: true, unique: true, trim: true },
    ownerRole: { type: String, enum: ['doctor', 'staff'], required: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    currency: { type: String, enum: ['GHS'], default: 'GHS' },
    availableBalance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    lifetimeEarnings: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', walletSchema);
