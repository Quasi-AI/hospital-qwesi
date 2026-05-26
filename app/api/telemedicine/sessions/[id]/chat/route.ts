import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import TelemedicineSession from '@/models/TelemedicineSession';

// GET - Get chat messages for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since'); // Get messages after this timestamp

    const telemedicineSession = await TelemedicineSession.findById(id)
      .select('chatMessages')
      .lean();

    if (!telemedicineSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let messages = telemedicineSession.chatMessages || [];

    // Filter messages after a certain timestamp (for polling)
    if (since) {
      const sinceDate = new Date(since);
      messages = messages.filter((msg: any) => new Date(msg.timestamp) > sinceDate);
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

// POST - Send a chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const data = await request.json();

    const telemedicineSession = await TelemedicineSession.findById(id);
    if (!telemedicineSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Validate message
    if (!data.message && !data.fileUrl) {
      return NextResponse.json(
        { error: 'Message or file is required' },
        { status: 400 }
      );
    }

    // Create new message
    const newMessage = {
      senderId: data.senderId || session.user.id,
      senderType: data.senderType || 'doctor',
      senderName: data.senderName || session.user.name || 'Unknown',
      message: data.message || '',
      messageType: data.messageType || 'text',
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      timestamp: new Date(),
      read: false,
    };

    telemedicineSession.chatMessages.push(newMessage);
    await telemedicineSession.save();

    // Return the new message with its ID
    const savedMessage = telemedicineSession.chatMessages[
      telemedicineSession.chatMessages.length - 1
    ];

    return NextResponse.json({ message: savedMessage }, { status: 201 });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send chat message' },
      { status: 500 }
    );
  }
}

// PUT - Mark messages as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const data = await request.json();

    const telemedicineSession = await TelemedicineSession.findById(id);
    if (!telemedicineSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Mark specified messages as read or all messages from a sender type
    if (data.messageIds) {
      telemedicineSession.chatMessages.forEach((msg: any) => {
        if (data.messageIds.includes(msg._id.toString())) {
          msg.read = true;
        }
      });
    } else if (data.markAllFromSenderType) {
      telemedicineSession.chatMessages.forEach((msg: any) => {
        if (msg.senderType === data.markAllFromSenderType) {
          msg.read = true;
        }
      });
    }

    await telemedicineSession.save();

    return NextResponse.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error updating chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to update chat messages' },
      { status: 500 }
    );
  }
}
