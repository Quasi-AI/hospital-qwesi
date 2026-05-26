import mongoose from 'mongoose';

export interface IImportedResult {
  sampleId: string;
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  resultStatus: 'normal' | 'abnormal' | 'critical' | 'pending';
  analyzedAt?: Date;
  matchedLabTestId?: string;
  matchedTestNumber?: string;
  matchConfidence: 'high' | 'medium' | 'low' | 'none';
  applied: boolean;
  appliedAt?: Date;
  notes?: string;
}

export interface ILabResultImport {
  _id: string;
  importNumber: string;
  deviceId?: string;
  deviceCode?: string;
  deviceName?: string;
  importedBy: string;
  importedByName?: string;
  importedAt: Date;
  source: 'csv' | 'api' | 'manual';
  fileName?: string;
  status: 'pending' | 'processing' | 'partial' | 'applied' | 'rejected';
  totalRecords: number;
  appliedRecords: number;
  results: IImportedResult[];
  rawData?: string;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const importedResultSchema = new mongoose.Schema({
  sampleId: { type: String, required: true, trim: true },
  testCode: { type: String, trim: true },
  testName: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  unit: { type: String, trim: true },
  normalRange: { type: String, trim: true },
  resultStatus: { type: String, enum: ['normal', 'abnormal', 'critical', 'pending'], default: 'pending' },
  analyzedAt: { type: Date },
  matchedLabTestId: { type: String, ref: 'LabTest' },
  matchedTestNumber: { type: String },
  matchConfidence: { type: String, enum: ['high', 'medium', 'low', 'none'], default: 'none' },
  applied: { type: Boolean, default: false },
  appliedAt: { type: Date },
  notes: { type: String, trim: true },
});

const labResultImportSchema = new mongoose.Schema<ILabResultImport>(
  {
    importNumber: { type: String, unique: true, required: true, trim: true },
    deviceId: { type: String, ref: 'LabDevice' },
    deviceCode: { type: String, trim: true },
    deviceName: { type: String, trim: true },
    importedBy: { type: String, required: true, ref: 'User' },
    importedByName: { type: String, trim: true },
    importedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['csv', 'api', 'manual'], required: true },
    fileName: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'processing', 'partial', 'applied', 'rejected'], default: 'pending' },
    totalRecords: { type: Number, default: 0 },
    appliedRecords: { type: Number, default: 0 },
    results: [importedResultSchema],
    rawData: { type: String },
    notes: { type: String, trim: true },
    reviewedBy: { type: String, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

labResultImportSchema.pre('save', async function () {
  if (!this.importNumber) {
    const count = await mongoose.models.LabResultImport?.countDocuments() || 0;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequence = String(count + 1).padStart(5, '0');
    this.importNumber = `IMP-${year}${month}${day}-${sequence}`;
  }
});

labResultImportSchema.index({ importNumber: 1 });
labResultImportSchema.index({ status: 1 });
labResultImportSchema.index({ importedAt: -1 });
labResultImportSchema.index({ deviceId: 1 });

const LabResultImport = mongoose.models.LabResultImport || mongoose.model<ILabResultImport>('LabResultImport', labResultImportSchema);

export default LabResultImport;
