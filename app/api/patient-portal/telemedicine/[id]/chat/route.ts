import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import dbConnect from '../../../../../../lib/mongodb';
import TelemedicineSession from '../../../../../../models/TelemedicineSession';
import Patient from '../../../../../../models/Patient';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized - Patient access only' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = params;
    const patientEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    // Find the patient by email
    const patient = await Patient.findOne({ email: patientEmail });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Find the telemedicine session
    const telemedicineSession = await TelemedicineSession.findById(id);
    if (!telemedicineSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify that this session belongs to the patient
    if (telemedicineSession.patientId.toString() !== patient._id.toString()) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    let messages = telemedicineSession.chatMessages || [];

    // Filter messages since a certain timestamp if provided
    if (since) {
      const sinceDate = new Date(since);
      messages = messages.filter((msg: any) => new Date(msg.timestamp) > sinceDate);
    }

    // Mark messages from doctor as read
    telemedicineSession.chatMessages.forEach((msg: any) => {
      if (msg.senderType === 'doctor' && !msg.read) {
        msg.read = true;
      }
    });
    await telemedicineSession.save();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized - Patient access only' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = params;
    const patientEmail = session.user.email;
    const data = await request.json();

    // Find the patient by email
    const patient = await Patient.findOne({ email: patientEmail });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Find the telemedicine session
    const telemedicineSession = await TelemedicineSession.findById(id);
    if (!telemedicineSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify that this session belongs to the patient
    if (telemedicineSession.patientId.toString() !== patient._id.toString()) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Prevent sending messages to cancelled or completed sessions
    if (['cancelled', 'completed'].includes(telemedicineSession.status)) {
      return NextResponse.json(
        { error: 'Cannot send messages to a closed session' },
        { status: 400 }
      );
    }

    // Create new message
    const newMessage = {
      senderId: patient._id,
      senderType: 'patient' as const,
      senderName: patient.name,
      message: data.message,
      messageType: data.messageType || 'text',
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      timestamp: new Date(),
      read: false,
    };

    telemedicineSession.chatMessages.push(newMessage);
    await telemedicineSession.save();

    // Get the saved message with _id
    const savedMessage = telemedicineSession.chatMessages[
      telemedicineSession.chatMessages.length - 1
    ];

    return NextResponse.json({ message: savedMessage });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
