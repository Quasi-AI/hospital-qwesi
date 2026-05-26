import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import AIResult from '../../../../models/AIResult';
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
    
    // First find the patient to get their ID
    const patient = await Patient.findOne({ email: patientEmail });
    
    if (!patient) {
      return NextResponse.json({ 
        aiInsights: [],
        total: 0 
      });
    }

    // Find AI results for this patient using both _id and patientId
    const aiInsights = await AIResult.find({ 
      $or: [
        { patientId: patient.patientId },
        { patientId: patient._id.toString() }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      aiInsights,
      total: aiInsights.length 
    });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI insights' },
      { status: 500 }
    );
  }
}
