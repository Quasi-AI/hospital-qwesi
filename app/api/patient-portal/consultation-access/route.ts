import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import { getPatientConsultationAccess } from '@/lib/patientConsultationAccess';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized - Patient access only' }, { status: 401 });
    }

    await dbConnect();
    const patient = await Patient.findOne({ email: session.user.email }).select('_id email').lean();
    if (!patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    const access = await getPatientConsultationAccess({
      patientEmail: session.user.email,
      patientMongoId: String(patient._id),
    });

    return NextResponse.json(access);
  } catch (error: any) {
    console.error('Patient consultation access error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load consultation access' }, { status: 500 });
  }
}
