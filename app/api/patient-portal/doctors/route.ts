import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Patient from '@/models/Patient';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const patient = await Patient.findOne({ email: session.user.email }).select('assignedDoctor email').lean();
    const appointments = await Appointment.find({
      patientEmail: session.user.email,
      doctorId: { $exists: true, $ne: null },
    }).select('doctorId').lean();

    const doctorIds = new Set(appointments.map((apt: any) => String(apt.doctorId)).filter(Boolean));
    let assignedDoctorName = '';
    if (patient?.assignedDoctor && /^[a-f0-9]{24}$/i.test(String(patient.assignedDoctor))) {
      doctorIds.add(String(patient.assignedDoctor));
    } else if (patient?.assignedDoctor) {
      assignedDoctorName = String(patient.assignedDoctor);
    }

    const doctorQuery: any = { role: 'doctor' };
    const or: any[] = [];
    if (doctorIds.size > 0) or.push({ _id: { $in: Array.from(doctorIds) } });
    if (assignedDoctorName) or.push({ name: assignedDoctorName });
    if (or.length) doctorQuery.$or = or;
    else doctorQuery._id = { $in: [] };

    const doctors = await User.find(doctorQuery)
      .select('name email image specialization department licenseNumber qualifications yearsOfExperience bio')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ doctors });
  } catch (error) {
    console.error('Patient doctors error:', error);
    return NextResponse.json({ error: 'Failed to load doctors' }, { status: 500 });
  }
}
