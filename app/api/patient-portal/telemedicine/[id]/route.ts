import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '../../../../../lib/mongodb';
import TelemedicineSession from '../../../../../models/TelemedicineSession';
import Patient from '../../../../../models/Patient';

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

    // Find the patient by email
    const patient = await Patient.findOne({ email: patientEmail });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Find the telemedicine session
    const telemedicineSession = await TelemedicineSession.findById(id)
      .populate('patientId', 'name email phone patientId')
      .populate('doctorId', 'name email specialization profilePhoto')
      .lean();

    if (!telemedicineSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify that this session belongs to the patient
    const sessionPatientId = (telemedicineSession as any).patientId?._id?.toString();
    if (sessionPatientId !== patient._id.toString()) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(telemedicineSession);
  } catch (error) {
    console.error('Error fetching telemedicine session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Handle patient actions
    if (data.action === 'join') {
      // Update participant status
      const participantIndex = telemedicineSession.participants.findIndex(
        (p: any) => p.odId.toString() === patient._id.toString() && p.odType === 'patient'
      );

      if (participantIndex >= 0) {
        telemedicineSession.participants[participantIndex].joinedAt = new Date();
        telemedicineSession.participants[participantIndex].connectionStatus = 'connected';
      } else {
        telemedicineSession.participants.push({
          odId: patient._id,
          odType: 'patient',
          name: patient.name,
          joinedAt: new Date(),
          connectionStatus: 'connected',
        });
      }

      // Update session status if not already in progress
      if (telemedicineSession.status === 'scheduled') {
        telemedicineSession.status = 'waiting';
      }

      telemedicineSession.patientDevice = request.headers.get('user-agent') || 'Unknown';
    } else if (data.action === 'leave') {
      // Update participant status
      const participantIndex = telemedicineSession.participants.findIndex(
        (p: any) => p.odId.toString() === patient._id.toString() && p.odType === 'patient'
      );

      if (participantIndex >= 0) {
        telemedicineSession.participants[participantIndex].leftAt = new Date();
        telemedicineSession.participants[participantIndex].connectionStatus = 'disconnected';
      }
    } else if (data.action === 'rate') {
      // Allow patient to rate the session after completion
      if (telemedicineSession.status === 'completed') {
        if (data.rating) {
          telemedicineSession.patientRating = Math.min(5, Math.max(1, data.rating));
        }
        if (data.feedback) {
          telemedicineSession.patientFeedback = data.feedback;
        }
      }
    }

    await telemedicineSession.save();

    const populatedSession = await TelemedicineSession.findById(id)
      .populate('patientId', 'name email phone patientId')
      .populate('doctorId', 'name email specialization profilePhoto');

    return NextResponse.json(populatedSession);
  } catch (error) {
    console.error('Error updating telemedicine session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
