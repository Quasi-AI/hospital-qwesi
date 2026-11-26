import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Patient from '@/models/Patient';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    if (session.user.role === 'patient') {
      if (scope === 'support') {
        const supportUsers = await User.find({
          $or: [{ role: 'admin' }, { email: 'info@qwesi.org' }],
        })
          .select('name email role image')
          .sort({ email: 1, name: 1 })
          .lean();

        return NextResponse.json({
          recipients: supportUsers.map((user: any) => ({
            entityType: 'user',
            entityId: String(user._id),
            role: user.role,
            name: user.email === 'info@qwesi.org' ? 'Qwesi Support' : user.name,
            email: user.email,
            image: user.image || '',
            specialization: 'Support',
          })),
        });
      }

      const patient = await Patient.findOne({ email: session.user.email }).select('assignedDoctor').lean();
      const appointments = await Appointment.find({
        patientEmail: session.user.email,
        doctorId: { $exists: true, $ne: null },
      }).select('doctorId').lean();
      const doctorIds = Array.from(new Set(appointments.map((apt: any) => String(apt.doctorId)).filter(Boolean)));
      let assignedDoctorName = '';
      if (patient?.assignedDoctor && /^[a-f0-9]{24}$/i.test(String(patient.assignedDoctor))) {
        doctorIds.push(String(patient.assignedDoctor));
      } else if (patient?.assignedDoctor) {
        assignedDoctorName = String(patient.assignedDoctor);
      }
      const doctorQuery: any = { role: 'doctor' };
      const or: any[] = [];
      if (doctorIds.length) or.push({ _id: { $in: Array.from(new Set(doctorIds)) } });
      if (assignedDoctorName) or.push({ name: assignedDoctorName });
      if (or.length) doctorQuery.$or = or;
      else doctorQuery._id = { $in: [] };
      const doctors = await User.find(doctorQuery)
        .select('name email role image specialization department bio qualifications yearsOfExperience')
        .sort({ name: 1 })
        .lean();
      return NextResponse.json({
        recipients: doctors.map((doctor: any) => ({
          entityType: 'user',
          entityId: String(doctor._id),
          role: doctor.role,
          name: doctor.name,
          email: doctor.email,
          image: doctor.image || '',
          specialization: doctor.specialization || '',
        })),
      });
    }

    const role = session.user.role || '';
    if (role !== 'admin') {
      // Everyone else on the team can reply to / reach the admin team.
      if (!['doctor', 'staff', 'nurse', 'pharmacy'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (role === 'pharmacy') {
        const admins = await User.find({ $or: [{ role: 'admin' }, { email: 'info@qwesi.org' }] }).select('name email role image').lean();
        return NextResponse.json({
          recipients: admins.map((u: any) => ({
            entityType: 'user', entityId: String(u._id), role: u.role, kind: 'admin',
            name: u.email === 'info@qwesi.org' ? 'Qwesi Support' : u.name, email: u.email, image: u.image || '', specialization: 'Support',
          })),
        });
      }
    }

    const q = (searchParams.get('q') || '').trim().slice(0, 60);
    const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const userFilter: any = {
      email: { $ne: session.user.email },
      deletedAt: { $exists: false },
      role: { $in: role === 'admin' ? ['doctor', 'staff', 'nurse', 'pharmacy', 'admin'] : ['doctor', 'staff', 'admin'] },
    };
    if (rx) userFilter.$or = [{ name: rx }, { email: rx }];

    const [users, patients] = await Promise.all([
      User.find(userFilter).select('name email role image specialization department practitionerType').sort({ name: 1 }).limit(150).lean(),
      role === 'admin' || role === 'doctor' || role === 'staff'
        ? Patient.find({ deletedAt: { $exists: false }, ...(rx ? { $or: [{ name: rx }, { email: rx }, { patientId: rx }] } : {}) })
            .select('name email patientId').sort({ name: 1 }).limit(rx ? 100 : 50).lean()
        : Promise.resolve([]),
    ]);

    const kindOf = (u: any) =>
      u.role === 'doctor' ? (u.practitionerType === 'herbalist' ? 'herbalist' : 'doctor')
      : u.role === 'pharmacy' ? 'pharmacist'
      : u.role === 'admin' ? 'admin' : 'staff';

    return NextResponse.json({
      recipients: [
        ...users.map((user: any) => ({
          entityType: 'user',
          entityId: String(user._id),
          role: user.role,
          kind: kindOf(user),
          name: user.name,
          email: user.email,
          image: user.image || '',
          specialization: user.specialization || user.department || '',
        })),
        ...(patients as any[]).map((patient: any) => ({
          entityType: 'patient',
          entityId: String(patient._id),
          role: 'patient',
          kind: 'patient',
          name: patient.name,
          email: patient.email,
          image: '',
          specialization: patient.patientId || '',
        })),
      ],
    });
  } catch (error) {
    console.error('Message recipients error:', error);
    return NextResponse.json({ error: 'Failed to load recipients' }, { status: 500 });
  }
}
