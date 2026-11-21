import mongoose from 'mongoose';

/**
 * Append-only money ledger for practitioner wallets.
 *  earning            consultation paid by a patient (gross - commission = net, held until released)
 *  refund_reversal    money taken back from the practitioner because the patient was refunded
 *  withdrawal_hold    amount moved out of "available" when a withdrawal is requested
 *  withdrawal_paid    admin paid it out (payout reference stored)
 *  withdrawal_released a rejected withdrawal returned to "available"
 *  adjustment         manual admin correction (always with a note)
 */
export type WalletTxType =
  | 'earning' | 'refund_reversal' | 'withdrawal_hold' | 'withdrawal_paid' | 'withdrawal_released' | 'adjustment';

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['earning', 'refund_reversal', 'withdrawal_hold', 'withdrawal_paid', 'withdrawal_released', 'adjustment'],
      required: true,
    },
    // earnings: held -> available (after completion + safety window) | reversed (refunded)
    status: { type: String, enum: ['held', 'available', 'reversed', 'settled'], default: 'settled' },
    currency: { type: String, required: true },
    gross: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    commissionPercent: { type: Number, default: 0 },
    amount: { type: Number, required: true }, // signed effect on the wallet (earning: +net, hold: -x, ...)
    appointmentId: { type: String, index: true },
    sessionId: { type: String },
    patientId: { type: String },
    paystackReference: { type: String },
    withdrawalId: { type: String },
    reference: { type: String }, // payout reference (Paystack transfer id / MoMo txn id)
    completedAt: { type: Date },
    releaseAt: { type: Date, index: true },
    disputed: { type: Boolean, default: false },
    note: { type: String, trim: true },
    createdBy: { type: String },
  },
  { timestamps: true }
);

// One earning per appointment -> crediting twice is impossible
walletTransactionSchema.index(
  { appointmentId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'earning' } }
);

export default mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', walletTransactionSchema);
