import mongoose from 'mongoose';

export type LandingKbKind = 'text' | 'json' | 'link' | 'file';

export interface ILandingKnowledgeEntry {
  title: string;
  enabled: boolean;
  kind: LandingKbKind;
  textBody: string;
  jsonBody: string;
  linkUrl: string;
  fileName: string;
  mimeType: string;
  /** Raw base64 payload only (no data: URL prefix). */
  fileBase64: string;
  /** Normalised plain text injected into the public landing assistant prompt. */
  resolvedText: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const landingKnowledgeEntrySchema = new mongoose.Schema<ILandingKnowledgeEntry>(
  {
    title: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    kind: {
      type: String,
      enum: ['text', 'json', 'link', 'file'],
      required: true,
    },
    textBody: { type: String, default: '' },
    jsonBody: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileBase64: { type: String, default: '' },
    resolvedText: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

landingKnowledgeEntrySchema.index({ enabled: 1, sortOrder: 1 });

export default mongoose.models.LandingKnowledgeEntry ||
  mongoose.model<ILandingKnowledgeEntry>('LandingKnowledgeEntry', landingKnowledgeEntrySchema);
