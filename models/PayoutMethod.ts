import mongoose from 'mongoose';

export interface IPayoutMethod {
  _id: string;
  ownerId: string;
  ownerRole: 'doctor' | 'staff';
  ownerName: string;
  type: 'mobile_money' | 'bank';
  label: string;
  accountName: string;
  accountNumber: string;
  mobileMoneyProvider?: string;
  bankName?: string;
  bankCode?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const payoutMethodSchema = new mongoose.Schema<IPayoutMethod>(
  {
    ownerId: { type: String, required: true, trim: true, index: true },
    ownerRole: { type: String, enum: ['doctor', 'staff'], required: true },
    ownerName: { type: String, required: true, trim: true },
    type: { type: String, enum: ['mobile_money', 'bank'], required: true },
    label: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    mobileMoneyProvider: { type: String, trim: true },
    bankName: { type: String, trim: true },
    bankCode: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

payoutMethodSchema.index({ ownerId: 1, isDefault: 1 });

export default mongoose.models.PayoutMethod ||
  mongoose.model<IPayoutMethod>('PayoutMethod', payoutMethodSchema);
