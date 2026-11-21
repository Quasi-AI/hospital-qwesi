import mongoose from 'mongoose';

export const REFUND_REASONS = [
  'practitioner_no_show',
  'practitioner_cancelled',
  'technical_failure',
  'poor_service',
  'other',
] as const;

const refundRequestSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    patientName: { type: String },
    patientEmail: { type: String },
    appointmentId: { type: String, required: true, index: true },
    sessionId: { type: String },
    doctorId: { type: String, index: true },
    doctorName: { type: String },
    transactionId: { type: String },
    reference: { type: String }, // original Paystack reference the money goes back to
    currency: { type: String, default: 'GHS' },
    amountPaid: { type: Number, default: 0 },
    reason: { type: String, enum: REFUND_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending_review', 'processed', 'manual_required', 'denied'],
      default: 'pending_review',
      index: true,
    },
    auto: { type: Boolean, default: false }, // approved by the no-show evidence rule, no human needed
    refundAmount: { type: Number, default: 0 },
    evidence: {
      scheduledStart: Date,
      patientJoinedAt: Date,
      practitionerJoinedAt: Date,
      sessionStatus: String,
      durationMinutes: Number,
      chatMessages: Number,
    },
    flagged: { type: Boolean, default: false }, // patient has many recent requests
    adminNote: { type: String, trim: true },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    providerResponse: { type: String },
  },
  { timestamps: true }
);

// A booking can only ever be refunded once
refundRequestSchema.index({ appointmentId: 1 }, { unique: true });

export default mongoose.models.RefundRequest || mongoose.model('RefundRequest', refundRequestSchema);
