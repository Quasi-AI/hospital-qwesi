import mongoose, { Schema, Document } from 'mongoose';

export interface IDispensingItem {
  medicineId: mongoose.Schema.Types.ObjectId;
  medicineName: string;
  genericName: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  instructions?: string;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface IDispensing extends Document {
  dispensingNumber: string;
  patientId: mongoose.Schema.Types.ObjectId;
  patientName: string;
  prescriptionId?: mongoose.Schema.Types.ObjectId;
  prescriptionNumber?: string;
  doctorId?: mongoose.Schema.Types.ObjectId;
  doctorName?: string;
  items: IDispensingItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'insurance' | 'waived';
  paymentMethod?: string;
  status: 'pending' | 'processing' | 'ready' | 'dispensed' | 'cancelled' | 'returned';
  dispensedBy?: string;
  dispensedAt?: Date;
  notes?: string;
  invoiceId?: mongoose.Schema.Types.ObjectId;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DispensingItemSchema: Schema = new Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  genericName: { type: String, required: true },
  dosage: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true },
  instructions: { type: String },
  batchNumber: { type: String },
  expiryDate: { type: Date },
});

const DispensingSchema: Schema = new Schema(
  {
    dispensingNumber: { type: String, required: true, unique: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientName: { type: String, required: true },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    prescriptionNumber: { type: String },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorName: { type: String },
    items: [DispensingItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'insurance', 'waived'],
      default: 'pending',
    },
    paymentMethod: { type: String },
    status: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'dispensed', 'cancelled', 'returned'],
      default: 'pending',
    },
    dispensedBy: { type: String },
    dispensedAt: { type: Date },
    notes: { type: String },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

if (mongoose.models.Dispensing) delete mongoose.models.Dispensing;
const Dispensing = mongoose.model<IDispensing>('Dispensing', DispensingSchema);

export default Dispensing;
