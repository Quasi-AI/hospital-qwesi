import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryItem extends Document {
  name: string;
  category: 'medical-supplies' | 'equipment' | 'consumables' | 'instruments' | 'furniture' | 'linen' | 'cleaning' | 'other';
  subCategory?: string;
  sku: string;
  barcode?: string;
  description?: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  maxStock: number;
  unitCost: number;
  totalValue: number;
  location?: string;
  department?: string;
  // For equipment
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  warrantyExpiry?: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceInterval?: number; // in days
  // Supplier
  supplierId?: mongoose.Schema.Types.ObjectId;
  supplierName?: string;
  // Status
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired' | 'discontinued';
  condition: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  isActive: boolean;
  // Expiry (for consumables)
  expiryDate?: Date;
  batchNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['medical-supplies', 'equipment', 'consumables', 'instruments', 'furniture', 'linen', 'cleaning', 'other'],
      required: true,
    },
    subCategory: { type: String },
    sku: { type: String, required: true, unique: true },
    barcode: { type: String, unique: true, sparse: true },
    description: { type: String },
    unit: { type: String, required: true, default: 'units' },
    currentStock: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10, min: 0 },
    maxStock: { type: Number, default: 1000 },
    unitCost: { type: Number, required: true, min: 0 },
    totalValue: { type: Number, default: 0 },
    location: { type: String },
    department: { type: String },
    serialNumber: { type: String },
    modelNumber: { type: String },
    manufacturer: { type: String },
    warrantyExpiry: { type: Date },
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDate: { type: Date },
    maintenanceInterval: { type: Number },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String },
    status: {
      type: String,
      enum: ['in-stock', 'low-stock', 'out-of-stock', 'expired', 'discontinued'],
      default: 'in-stock',
    },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor', 'damaged'],
      default: 'new',
    },
    isActive: { type: Boolean, default: true },
    expiryDate: { type: Date },
    batchNumber: { type: String },
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Pre-save hook to update total value and status
InventoryItemSchema.pre('save', function (next) {
  this.totalValue = this.currentStock * this.unitCost;
  
  if (this.currentStock === 0) {
    this.status = 'out-of-stock';
  } else if (this.currentStock <= this.reorderLevel) {
    this.status = 'low-stock';
  } else {
    this.status = 'in-stock';
  }
  
  if (this.expiryDate && new Date(this.expiryDate) < new Date()) {
    this.status = 'expired';
  }
  
  next();
});

InventoryItemSchema.index({ name: 'text', description: 'text' });
InventoryItemSchema.index({ category: 1 });
InventoryItemSchema.index({ status: 1 });

if (mongoose.models.InventoryItem) delete mongoose.models.InventoryItem;
const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);

export default InventoryItem;
