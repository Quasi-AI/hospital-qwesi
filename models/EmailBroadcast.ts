import mongoose, { Schema } from 'mongoose';

const EmailBroadcastSchema = new Schema(
  {
    subject: { type: String, required: true },
    message: { type: String, required: true },
    groups: { type: [String], default: [] },
    specific: { type: [{ kind: String, id: String, name: String, email: String }], default: [] },
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    failures: { type: [{ email: String, error: String }], default: [] },
    status: { type: String, enum: ['sending', 'done'], default: 'sending' },
    createdBy: { type: String },
    createdByName: { type: String },
  },
  { timestamps: true }
);
EmailBroadcastSchema.index({ createdAt: -1 });

export default mongoose.models.EmailBroadcast || mongoose.model('EmailBroadcast', EmailBroadcastSchema);
