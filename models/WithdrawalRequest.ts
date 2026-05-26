import mongoose from 'mongoose';

export interface IWithdrawalRequest {
  _id: string;
  walletId: string;
  ownerId: string;
  ownerRole: 'doctor' | 'staff';
  ownerName: string;
  amount: number;
  currency: 'GHS';
  payoutMethod: 'mobile_money' | 'bank';
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  bankName?: string;
  mobileMoneyProvider?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalRequestSchema = new mongoose.Schema<IWithdrawalRequest>(
  {
    walletId: { type: String, required: true, trim: true, index: true },
    ownerId: { type: String, required: true, trim: true, index: true },
    ownerRole: { type: String, enum: ['doctor', 'staff'], required: true },
    ownerName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['GHS'], default: 'GHS' },
    payoutMethod: { type: String, enum: ['mobile_money', 'bank'], required: true },
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    bankCode: { type: String, trim: true },
    bankName: { type: String, trim: true },
    mobileMoneyProvider: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'rejected'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, trim: true },
    reviewedBy: { type: String, trim: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.WithdrawalRequest ||
  mongoose.model<IWithdrawalRequest>('WithdrawalRequest', withdrawalRequestSchema);
