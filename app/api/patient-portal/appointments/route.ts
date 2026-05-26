import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import Appointment from '../../../../models/Appointment';
import TelemedicineSession from '../../../../models/TelemedicineSession';

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

    // Find appointments for this patient by email with telemedicine session populated
    const appointments = await Appointment.find({ 
      patientEmail: patientEmail 
    })
      .populate({
        path: 'telemedicineSessionId',
        select: 'sessionNumber status consultationType scheduledStartTime scheduledEndTime roomId roomUrl'
      })
      .sort({ appointmentDate: -1 })
      .lean();

    // Also find telemedicine sessions directly linked to this patient (by email lookup)
    // This catches sessions that might not be linked via appointmentId
    const telemedicineSessions = await TelemedicineSession.find({
      status: { $in: ['scheduled', 'waiting', 'in-progress'] }
    })
      .populate('patientId', 'email name')
      .populate('doctorId', 'name email')
      .lean();

    // Filter sessions for this patient
    const patientSessions = telemedicineSessions.filter((ts: any) => 
      ts.patientId?.email === patientEmail
    );

    return NextResponse.json({ 
      appointments,
      telemedicineSessions: patientSessions,
      total: appointments.length 
    });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
