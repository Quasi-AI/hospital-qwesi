import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import Report from '../../../../models/Report';
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
    
    // First find the patient to get their patientId
    const patient = await Patient.findOne({ email: patientEmail });
    
    if (!patient) {
      return NextResponse.json({ 
        reports: [],
        total: 0 
      });
    }

    // Find reports for this patient
    const reports = await Report.find({ 
      $or: [
        { patientId: patient.patientId },
        { patientId: patient._id.toString() }
      ]
    })
      .sort({ reportDate: -1 })
      .lean();

    return NextResponse.json({ 
      reports,
      total: reports.length 
    });
  } catch (error) {
    console.error('Error fetching patient reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
