import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicine extends Document {
  name: string;
  genericName: string;
  brandName?: string;
  category: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'ointment' | 'drops' | 'inhaler' | 'powder' | 'solution' | 'suspension' | 'other';
  dosageForm: string;
  strength: string;
  unit: string;
  manufacturer?: string;
  batchNumber?: string;
  barcode?: string;
  sku: string;
  description?: string;
  composition?: string;
  sideEffects?: string;
  contraindications?: string;
  storageConditions?: string;
  prescriptionRequired: boolean;
  // Stock Management
  currentStock: number;
  reorderLevel: number;
  maxStock: number;
  unitCost: number;
  sellingPrice: number;
  // Expiry Tracking
  expiryDate?: Date;
  manufacturingDate?: Date;
  // Location
  shelfLocation?: string;
  // Status
  isActive: boolean;
  // Alternatives
  genericAlternatives?: mongoose.Schema.Types.ObjectId[];
  // Supplier
  supplierId?: mongoose.Schema.Types.ObjectId;
  supplierName?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    genericName: { type: String, required: true, trim: true },
    brandName: { type: String, trim: true },
    category: {
      type: String,
      enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'powder', 'solution', 'suspension', 'other'],
      required: true,
    },
    dosageForm: { type: String, required: true },
    strength: { type: String, required: true },
    unit: { type: String, required: true, default: 'units' },
    manufacturer: { type: String },
    batchNumber: { type: String },
    barcode: { type: String, unique: true, sparse: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String },
    composition: { type: String },
    sideEffects: { type: String },
    contraindications: { type: String },
    storageConditions: { type: String },
    prescriptionRequired: { type: Boolean, default: true },
    currentStock: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10, min: 0 },
    maxStock: { type: Number, default: 1000 },
    unitCost: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date },
    manufacturingDate: { type: Date },
    shelfLocation: { type: String },
    isActive: { type: Boolean, default: true },
    genericAlternatives: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }],
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes for efficient queries
MedicineSchema.index({ name: 'text', genericName: 'text', brandName: 'text' });
MedicineSchema.index({ category: 1 });
MedicineSchema.index({ currentStock: 1, reorderLevel: 1 });
MedicineSchema.index({ expiryDate: 1 });

if (mongoose.models.Medicine) delete mongoose.models.Medicine;
const Medicine = mongoose.model<IMedicine>('Medicine', MedicineSchema);

export default Medicine;
