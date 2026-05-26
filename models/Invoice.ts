import mongoose from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  serviceType?: 'consultation' | 'procedure' | 'test' | 'medication' | 'room' | 'other';
  serviceId?: string; // Reference to appointment, lab test, etc.
}

export interface IInvoice {
  _id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  items: IInvoiceItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
  dueDate?: Date;
  notes?: string;
  createdBy: string; // User ID who created the invoice
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new mongoose.Schema<IInvoiceItem>({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  serviceType: {
    type: String,
    enum: ['consultation', 'procedure', 'test', 'medication', 'room', 'other'],
  },
  serviceId: {
    type: String,
    trim: true,
  },
});

const invoiceSchema = new mongoose.Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
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
    patientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    patientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'partial', 'paid', 'cancelled'],
      default: 'draft',
    },
    dueDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
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

// Pre-save middleware to generate invoice number
invoiceSchema.pre('save', async function() {
  if (!this.invoiceNumber) {
    const count = await mongoose.models.Invoice?.countDocuments() || 0;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = String(count + 1).padStart(6, '0');
    this.invoiceNumber = `INV-${year}${month}-${sequence}`;
  }
});

// Prevent multiple model initialization in development
export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);
