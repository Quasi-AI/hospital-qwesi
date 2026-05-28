import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import TelemedicineSession from '@/models/TelemedicineSession';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import { createNotification } from '@/lib/notifications/notification-service';
import { emitRealtimeEvent } from '@/lib/realtime';

// GET - Get single telemedicine session
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

    const telemedicineSession = await TelemedicineSession.findById(id)
      .populate('patientId', 'name email phone patientId dateOfBirth gender address')
      .populate({ path: 'doctorId', model: User, select: 'name email specialization phone' })
      .populate('appointmentId', 'appointmentNumber appointmentDate')
      .populate('prescriptionId')
      .populate('invoiceId')
      .lean();

    if (!telemedicineSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If user is a doctor, verify they own this session
    if (session.user.role === 'doctor') {
      const doctorId = (telemedicineSession as any).doctorId;
      const sessionDoctorEmail = doctorId?.email || '';
      if (sessionDoctorEmail !== session.user.email) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json(telemedicineSession);
  } catch (error) {
    console.error('Error fetching telemedicine session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch telemedicine session' },
      { status: 500 }
    );
  }
}

// PUT - Update telemedicine session
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

    const telemedicineSession = await TelemedicineSession.findById(id)
      .populate({ path: 'doctorId', model: User, select: 'email' });
    if (!telemedicineSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If user is a doctor, verify they own this session
    if (session.user.role === 'doctor') {
      const sessionDoctorEmail = (telemedicineSession.doctorId as any)?.email || '';
      if (sessionDoctorEmail !== session.user.email) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Handle status changes
    let oldStatus = telemedicineSession.status;
    let statusChanged = false;
    if (data.status) {
      const newStatus = data.status;
      statusChanged = oldStatus !== newStatus;

      // Start session
      if (newStatus === 'in-progress' && oldStatus !== 'in-progress') {
        const fee = Number(telemedicineSession.consultationFee || 0);
        const canStartPaidSession = ['paid', 'waived'].includes(telemedicineSession.paymentStatus);
        if (fee > 0 && !canStartPaidSession) {
          return NextResponse.json(
            { error: 'Payment is required before this consultation can start' },
            { status: 402 }
          );
        }
        data.actualStartTime = new Date();
      }

      // End session
      if (newStatus === 'completed' && oldStatus === 'in-progress') {
        data.actualEndTime = new Date();
      }
    }

    // Handle chat message
    if (data.newChatMessage) {
      telemedicineSession.chatMessages.push({
        senderId: data.newChatMessage.senderId,
        senderType: data.newChatMessage.senderType,
        senderName: data.newChatMessage.senderName,
        message: data.newChatMessage.message,
        messageType: data.newChatMessage.messageType || 'text',
        fileUrl: data.newChatMessage.fileUrl,
        fileName: data.newChatMessage.fileName,
        timestamp: new Date(),
        read: false,
      });
      delete data.newChatMessage;
    }

    // Handle participant status update
    if (data.participantUpdate) {
      const { odId, connectionStatus } = data.participantUpdate;
      const participant = telemedicineSession.participants.find(
        (p: any) => p.odId.toString() === odId
      );
      if (participant) {
        participant.connectionStatus = connectionStatus;
        if (connectionStatus === 'connected' && !participant.joinedAt) {
          participant.joinedAt = new Date();
        }
        if (connectionStatus === 'disconnected') {
          participant.leftAt = new Date();
        }
      }
      delete data.participantUpdate;
    }

    // Handle vital signs
    if (data.newVitalSigns) {
      telemedicineSession.vitalSigns.push({
        ...data.newVitalSigns,
        recordedAt: new Date(),
      });
      delete data.newVitalSigns;
    }

    // Update other fields
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        (telemedicineSession as any)[key] = data[key];
      }
    });

    await telemedicineSession.save();

    // Populate and return
    const populatedSession = await TelemedicineSession.findById(id)
      .populate('patientId', 'name email phone patientId')
      .populate({ path: 'doctorId', model: User, select: 'name email specialization' })
      .populate('appointmentId', 'appointmentNumber')
      .lean();

    if (populatedSession) {
      const patient = (populatedSession as any).patientId;
      const doctor = (populatedSession as any).doctorId;
      const sessionTargets = [
        'role:admin',
        'role:staff',
        doctor?._id ? `user:${String(doctor._id)}` : '',
        patient?._id ? `patient:${String(patient._id)}` : '',
        patient?.patientId ? `patient:${patient.patientId}` : '',
      ].filter(Boolean);

      await emitRealtimeEvent({
        type: 'telemedicine.session.updated',
        targets: sessionTargets,
        payload: {
          sessionId: String((populatedSession as any)._id),
          sessionNumber: (populatedSession as any).sessionNumber,
          status: (populatedSession as any).status,
          oldStatus,
        },
      });

      if (statusChanged) {
        const title = `Telemedicine session ${String((populatedSession as any).status).replace('-', ' ')}`;
        const message = `Session ${(populatedSession as any).sessionNumber} changed from ${oldStatus} to ${(populatedSession as any).status}.`;
        const actorId = session.user.id;
        const notifications = [];

        if (doctor?._id && String(doctor._id) !== actorId) {
          notifications.push(createNotification({
            type: 'telemedicine',
            recipientId: String(doctor._id),
            recipientType: 'user',
            recipientEmail: doctor.email,
            title,
            message,
            priority: (populatedSession as any).status === 'waiting' ? 'high' : 'normal',
            relatedEntity: { type: 'telemedicineSession', id: String((populatedSession as any)._id) },
            metadata: { sessionId: String((populatedSession as any)._id) },
          }));
        }

        if (patient?._id && String(patient._id) !== actorId) {
          notifications.push(createNotification({
            type: 'telemedicine',
            recipientId: String(patient._id),
            recipientType: 'patient',
            recipientEmail: patient.email,
            recipientPhone: patient.phone,
            title,
            message,
            priority: 'normal',
            relatedEntity: { type: 'telemedicineSession', id: String((populatedSession as any)._id) },
            metadata: { sessionId: String((populatedSession as any)._id) },
          }));
        }

        await Promise.all(notifications);
      }
    }

    return NextResponse.json(populatedSession);
  } catch (error) {
    console.error('Error updating telemedicine session:', error);
    return NextResponse.json(
      { error: 'Failed to update telemedicine session' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/delete telemedicine session
export async function DELETE(
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

    const telemedicineSession = await TelemedicineSession.findById(id)
      .populate({ path: 'doctorId', model: User, select: 'email' });
    if (!telemedicineSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If user is a doctor, verify they own this session
    if (session.user.role === 'doctor') {
      const sessionDoctorEmail = (telemedicineSession.doctorId as any)?.email || '';
      if (sessionDoctorEmail !== session.user.email) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    if (telemedicineSession.status === 'in-progress') {
      return NextResponse.json(
        { error: 'Cannot delete an active session' },
        { status: 400 }
      );
    }

    const appointmentId = (telemedicineSession as any).appointmentId;
    await TelemedicineSession.findByIdAndDelete(id);
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { $unset: { telemedicineSessionId: 1 } });
    }

    await emitRealtimeEvent({
      type: 'telemedicine.session.deleted',
      targets: [
        'role:admin',
        'role:staff',
        `user:${String((telemedicineSession.doctorId as any)?._id || telemedicineSession.doctorId)}`,
        `patient:${String((telemedicineSession as any).patientId)}`,
      ],
      payload: { sessionId: id, sessionNumber: telemedicineSession.sessionNumber },
    });

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting telemedicine session:', error);
    return NextResponse.json(
      { error: 'Failed to delete telemedicine session' },
      { status: 500 }
    );
  }
}
