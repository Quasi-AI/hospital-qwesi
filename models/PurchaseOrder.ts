import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseOrderItem {
  itemType: 'medicine' | 'inventory';
  itemId: mongoose.Schema.Types.ObjectId;
  itemName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQuantity: number;
  status: 'pending' | 'partial' | 'received';
}

export interface IPurchaseOrder extends Document {
  orderNumber: string;
  supplierId: mongoose.Schema.Types.ObjectId;
  supplierName: string;
  items: IPurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  shippingCost: number;
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  receivedBy?: string;
  receivedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema: Schema = new Schema({
  itemType: { type: String, enum: ['medicine', 'inventory'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true },
  receivedQuantity: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'partial', 'received'], default: 'pending' },
});

const PurchaseOrderSchema: Schema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true },
    items: [PurchaseOrderItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'],
      default: 'draft',
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    paymentMethod: { type: String },
    notes: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    receivedBy: { type: String },
    receivedAt: { type: Date },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

if (mongoose.models.PurchaseOrder) delete mongoose.models.PurchaseOrder;
const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);

export default PurchaseOrder;
