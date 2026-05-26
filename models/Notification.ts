import mongoose from 'mongoose';

export interface INotification {
  _id: string;
  type: 'appointment_reminder' | 'lab_result' | 'payment_due' | 'medication_reminder' | 'follow_up' | 'system';
  recipientId: string;
  recipientType: 'user' | 'patient';
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  message: string;
  channels: ('email' | 'sms' | 'in_app')[];
  status: 'pending' | 'sent' | 'failed' | 'read';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  relatedEntity?: {
    type: string;
    id: string;
  };
  deliveryStatus: {
    email?: {
      sent: boolean;
      sentAt?: Date;
      error?: string;
    };
    sms?: {
      sent: boolean;
      sentAt?: Date;
      error?: string;
    };
    inApp?: {
      sent: boolean;
      sentAt?: Date;
    };
  };
  metadata?: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema<INotification>(
  {
    type: {
      type: String,
      required: true,
      enum: ['appointment_reminder', 'lab_result', 'payment_due', 'medication_reminder', 'follow_up', 'system'],
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      required: true,
      enum: ['user', 'patient'],
    },
    recipientEmail: {
      type: String,
      trim: true,
    },
    recipientPhone: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'in_app'],
    }],
    status: {
      type: String,
      required: true,
      enum: ['pending', 'sent', 'failed', 'read'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    scheduledFor: {
      type: Date,
      index: true,
    },
    sentAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    relatedEntity: {
      type: {
        type: String,
      },
      id: {
        type: String,
      },
    },
    deliveryStatus: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
      inApp: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ recipientId: 1, status: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
