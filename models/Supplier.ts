import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  supplyType: ('medicines' | 'equipment' | 'consumables' | 'all')[];
  taxId?: string;
  licenseNumber?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  paymentTerms?: string;
  creditLimit?: number;
  rating?: number;
  isActive: boolean;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    contactPerson: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    alternatePhone: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    supplyType: [{
      type: String,
      enum: ['medicines', 'equipment', 'consumables', 'all'],
    }],
    taxId: { type: String },
    licenseNumber: { type: String },
    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
    },
    paymentTerms: { type: String },
    creditLimit: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

if (mongoose.models.Supplier) delete mongoose.models.Supplier;
const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);

export default Supplier;
