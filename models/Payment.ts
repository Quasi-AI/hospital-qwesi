import mongoose from 'mongoose';

export interface IPayment {
  _id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank-transfer' | 'cheque';
  paymentDate: Date;
  transactionId?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdBy: string; // User ID who recorded the payment
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema<IPayment>(
  {
    paymentNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    invoiceId: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank-transfer', 'cheque'],
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate payment number
paymentSchema.pre('save', async function() {
  if (!this.paymentNumber) {
    const count = await mongoose.models.Payment?.countDocuments() || 0;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = String(count + 1).padStart(6, '0');
    this.paymentNumber = `PAY-${year}${month}-${sequence}`;
  }
});

// Prevent multiple model initialization in development
export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);
