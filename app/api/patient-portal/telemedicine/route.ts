import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import TelemedicineSession from '../../../../models/TelemedicineSession';
import Patient from '../../../../models/Patient';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized - Patient access only' },
        { status: 401 }
      );
    }

    await dbConnect();

    const patientEmail = session.user.email;

    // Find the patient by email
    const patient = await Patient.findOne({ email: patientEmail });
    if (!patient) {
      return NextResponse.json({
        sessions: [],
        total: 0,
      });
    }

    // Find all telemedicine sessions for this patient
    const telemedicineSessions = await TelemedicineSession.find({
      patientId: patient._id,
    })
      .populate('doctorId', 'name email specialization profilePhoto')
      .sort({ scheduledStartTime: -1 })
      .lean();

    return NextResponse.json({
      sessions: telemedicineSessions,
      total: telemedicineSessions.length,
    });
  } catch (error) {
    console.error('Error fetching patient telemedicine sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch telemedicine sessions' },
      { status: 500 }
    );
  }
}
