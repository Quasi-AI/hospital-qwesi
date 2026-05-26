import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import TelemedicineSession from '@/models/TelemedicineSession';
import User from '@/models/User';
import Report from '@/models/Report';

// GET - Get prescription for a session
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
      .populate('prescriptionId')
      .lean();

    if (!telemedicineSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!telemedicineSession.prescriptionId) {
      return NextResponse.json({ prescription: null });
    }

    return NextResponse.json({ prescription: telemedicineSession.prescriptionId });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prescription' },
      { status: 500 }
    );
  }
}

// POST - Create prescription for a session
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

    const telemedicineSession = await TelemedicineSession.findById(id)
      .populate('patientId', 'name patientId')
      .populate({ path: 'doctorId', model: User, select: 'name' });

    if (!telemedicineSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create a new medical report (prescription)
    const prescription = new Report({
      patientId: telemedicineSession.patientId._id,
      doctorId: telemedicineSession.doctorId._id,
      reportType: 'prescription',
      reportDate: new Date(),
      title: `Telemedicine Prescription - ${telemedicineSession.sessionNumber}`,
      description: data.description || `Prescription from telemedicine consultation`,
      diagnosis: data.diagnosis || telemedicineSession.diagnosis,
      findings: data.findings || telemedicineSession.clinicalNotes,
      medications: data.medications || [],
      recommendations: data.recommendations || [],
      followUpDate: data.followUpDate || telemedicineSession.followUpDate,
      telemedicineSessionId: telemedicineSession._id,
      status: 'final',
      createdBy: session.user.id,
    });

    await prescription.save();

    // Link prescription to session
    telemedicineSession.prescriptionId = prescription._id;
    if (data.diagnosis) {
      telemedicineSession.diagnosis = data.diagnosis;
    }
    await telemedicineSession.save();

    // Add prescription message to chat
    telemedicineSession.chatMessages.push({
      senderId: session.user.id,
      senderType: 'doctor',
      senderName: (telemedicineSession.doctorId as any).name,
      message: 'Prescription has been created',
      messageType: 'prescription',
      timestamp: new Date(),
      read: false,
    });
    await telemedicineSession.save();

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error) {
    console.error('Error creating prescription:', error);
    return NextResponse.json(
      { error: 'Failed to create prescription' },
      { status: 500 }
    );
  }
}

// PUT - Update prescription
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

    if (!telemedicineSession.prescriptionId) {
      return NextResponse.json(
        { error: 'No prescription exists for this session' },
        { status: 404 }
      );
    }

    const prescription = await Report.findByIdAndUpdate(
      telemedicineSession.prescriptionId,
      {
        $set: {
          diagnosis: data.diagnosis,
          findings: data.findings,
          medications: data.medications,
          recommendations: data.recommendations,
          followUpDate: data.followUpDate,
        }
      },
      { new: true }
    );

    return NextResponse.json({ prescription });
  } catch (error) {
    console.error('Error updating prescription:', error);
    return NextResponse.json(
      { error: 'Failed to update prescription' },
      { status: 500 }
    );
  }
}
