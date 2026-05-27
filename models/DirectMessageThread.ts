import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export type MessageEntityType = 'user' | 'patient';
export type MessageRole = 'admin' | 'doctor' | 'staff' | 'patient';

export interface IMessageParticipant {
  entityType: MessageEntityType;
  entityId: mongoose.Types.ObjectId;
  role: MessageRole;
  name: string;
  email: string;
  image?: string;
}

export interface IDirectMessage {
  senderType: MessageEntityType;
  senderId: mongoose.Types.ObjectId;
  senderRole: MessageRole;
  senderName: string;
  body: string;
  readBy: string[];
  createdAt: Date;
}

export interface IDirectMessageThread extends MongoDocument {
  participants: IMessageParticipant[];
  participantKey: string;
  messages: IDirectMessage[];
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IMessageParticipant>(
  {
    entityType: { type: String, enum: ['user', 'patient'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['admin', 'doctor', 'staff', 'patient'], required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const MessageSchema = new Schema<IDirectMessage>(
  {
    senderType: { type: String, enum: ['user', 'patient'], required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['admin', 'doctor', 'staff', 'patient'], required: true },
    senderName: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    readBy: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DirectMessageThreadSchema = new Schema<IDirectMessageThread>(
  {
    participants: { type: [ParticipantSchema], required: true },
    participantKey: { type: String, required: true, unique: true, index: true },
    messages: { type: [MessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

DirectMessageThreadSchema.index({ 'participants.entityId': 1, lastMessageAt: -1 });

export default mongoose.models.DirectMessageThread ||
  mongoose.model<IDirectMessageThread>('DirectMessageThread', DirectMessageThreadSchema);
