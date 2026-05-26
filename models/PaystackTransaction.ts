import mongoose from 'mongoose';

export interface IPaystackTransaction {
  _id: string;
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  userId?: string;
  userRole?: string;
  email: string;
  itemType: 'subscription' | 'payg' | 'invoice';
  itemId: string;
  itemName: string;
  amount: number;
  currency: 'GHS' | 'USD';
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  paystackStatus?: string;
  paystackTransactionId?: string;
  metadata?: Record<string, unknown>;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paystackTransactionSchema = new mongoose.Schema<IPaystackTransaction>(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    authorizationUrl: { type: String, default: '' },
    accessCode: { type: String, default: '' },
    userId: { type: String, trim: true },
    userRole: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    itemType: { type: String, enum: ['subscription', 'payg', 'invoice'], required: true },
    itemId: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['GHS', 'USD'], required: true },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'abandoned'],
      default: 'pending',
      index: true,
    },
    paystackStatus: { type: String, trim: true },
    paystackTransactionId: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

paystackTransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.PaystackTransaction ||
  mongoose.model<IPaystackTransaction>('PaystackTransaction', paystackTransactionSchema);
