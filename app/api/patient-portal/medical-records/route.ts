import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
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
    
    // Find the patient record
    const patient = await Patient.findOne({ email: patientEmail })
      .select('-password')
      .lean();
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Error fetching patient medical records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medical records' },
      { status: 500 }
    );
  }
}

// Allow patient to update certain fields
export async function PUT(request: NextRequest) {
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
    const body = await request.json();
    
    // Only allow updating specific fields
    const allowedUpdates = {
      phone: body.phone,
      address: body.address,
      emergencyContact: body.emergencyContact,
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
        delete allowedUpdates[key as keyof typeof allowedUpdates];
      }
    });

    const patient = await Patient.findOneAndUpdate(
      { email: patientEmail },
      { $set: allowedUpdates },
      { new: true }
    ).select('-password');

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Error updating patient records:', error);
    return NextResponse.json(
      { error: 'Failed to update records' },
      { status: 500 }
    );
  }
}
