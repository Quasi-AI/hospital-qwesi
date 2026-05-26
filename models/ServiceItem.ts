import mongoose from 'mongoose';

export interface IServiceItem {
  _id: string;
  name: string;
  description: string;
  unitPrice: number;
  serviceType: 'consultation' | 'procedure' | 'test' | 'medication' | 'room' | 'other';
  isActive: boolean;
  createdBy: string; // User ID who created the service item
  createdAt: Date;
  updatedAt: Date;
}

const serviceItemSchema = new mongoose.Schema<IServiceItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    serviceType: {
      type: String,
      enum: ['consultation', 'procedure', 'test', 'medication', 'room', 'other'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Prevent multiple model initialization in development
export default mongoose.models.ServiceItem || mongoose.model<IServiceItem>('ServiceItem', serviceItemSchema);
