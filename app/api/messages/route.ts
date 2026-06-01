import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import { currentMessagingParticipant, participantKey } from '@/lib/messaging';
import DirectMessageThread from '@/models/DirectMessageThread';
import Patient from '@/models/Patient';
import User from '@/models/User';
import { createNotification } from '@/lib/notifications/notification-service';
import { emitRealtimeEvent } from '@/lib/realtime';

async function recipientParticipant(entityType: 'user' | 'patient', entityId: string) {
  if (!mongoose.Types.ObjectId.isValid(entityId)) return null;
  if (entityType === 'patient') {
    const patient = await Patient.findById(entityId).select('name email').lean();
    if (!patient) return null;
    return {
      entityType,
      entityId: patient._id,
      role: 'patient',
      name: patient.name,
      email: patient.email,
      image: '',
    };
  }

  const user = await User.findById(entityId).select('name email role image').lean();
  if (!user || !['admin', 'doctor', 'staff'].includes(user.role)) return null;
  return {
    entityType,
    entityId: user._id,
    role: user.role,
    name: user.name,
    email: user.email,
    image: user.image || '',
  };
}

function pairAllowed(senderRole: string, recipientRole: string) {
  if (senderRole === 'admin') return true;
  if (senderRole === 'patient' && recipientRole === 'admin') return true;
  const key = [senderRole, recipientRole].sort().join(':');
  return ['doctor:doctor', 'doctor:staff', 'doctor:patient'].includes(key);
}

function supportThreadFilter(currentEntityId: unknown) {
  return {
    'participants.entityId': currentEntityId,
    participants: {
      $elemMatch: {
        entityId: { $ne: currentEntityId },
        $or: [{ role: 'admin' }, { email: 'info@qwesi.org' }],
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const current = await currentMessagingParticipant(session);
    if (!current) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const query =
      scope === 'support' && current.role === 'patient'
        ? supportThreadFilter(current.entityId)
        : { 'participants.entityId': current.entityId };

    const threads = await DirectMessageThread.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ threads, current });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.body?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!['user', 'patient'].includes(body.recipientEntityType)) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
    }

    await dbConnect();
    const sender = await currentMessagingParticipant(session);
    const recipient = await recipientParticipant(body.recipientEntityType, body.recipientId);
    if (!sender || !recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }
    if (!pairAllowed(sender.role, recipient.role)) {
      return NextResponse.json({ error: 'This message route is not allowed' }, { status: 403 });
    }

    const key = participantKey([
      { entityType: sender.entityType, entityId: String(sender.entityId) },
      { entityType: recipient.entityType, entityId: String(recipient.entityId) },
    ]);

    const message = {
      senderType: sender.entityType,
      senderId: sender.entityId,
      senderRole: sender.role,
      senderName: sender.name,
      body: body.body.trim(),
      readBy: [String(sender.entityId)],
      createdAt: new Date(),
    };

    const thread = await DirectMessageThread.findOneAndUpdate(
      { participantKey: key },
      {
        $setOnInsert: { participants: [sender, recipient], participantKey: key },
        $push: { messages: message },
        $set: { lastMessageAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    ).lean();

    const recipientTarget = `${recipient.entityType}:${String(recipient.entityId)}`;
    await emitRealtimeEvent({
      type: 'message.created',
      targets: [recipientTarget],
      payload: {
        threadId: String(thread?._id || ''),
        senderName: sender.name,
        body: message.body,
        recipientId: String(recipient.entityId),
        recipientType: recipient.entityType,
        createdAt: message.createdAt,
      },
    });

    await createNotification({
      type: 'direct_message',
      recipientId: String(recipient.entityId),
      recipientType: recipient.entityType,
      recipientEmail: recipient.email,
      title: `New message from ${sender.name}`,
      message: message.body,
      priority: 'normal',
      relatedEntity: { type: 'directMessageThread', id: String(thread?._id || '') },
      metadata: {
        threadId: String(thread?._id || ''),
        senderId: String(sender.entityId),
        senderName: sender.name,
      },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    console.error('Message send error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
