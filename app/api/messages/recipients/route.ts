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

    const role = session.user.role === 'hospital' ? 'admin' : (session.user.role || '');
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

    // Paged directory used by the "New message" picker: one group at a time, with counts.
    const kindParam = searchParams.get('kind');
    if (kindParam && role !== 'pharmacy') {
      const q0 = (searchParams.get('q') || '').trim().slice(0, 60);
      const rx0 = q0 ? new RegExp(q0.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
      const page = Math.max(0, Number(searchParams.get('page')) || 0);
      const limit = 30;
      const live = { deletedAt: { $exists: false } };
      const nameMatch = (extra: string[] = []) => (rx0 ? { $or: [{ name: rx0 }, { email: rx0 }, ...extra.map((f) => ({ [f]: rx0 }))] } : {});
      const userFilters: Record<string, any> = {
        doctor: { role: 'doctor', practitionerType: { $ne: 'herbalist' } },
        herbalist: { role: 'doctor', practitionerType: 'herbalist' },
        pharmacist: { role: 'pharmacy' },
        staff: { role: { $in: ['staff', 'nurse'] } },
        admin: { role: 'admin' },
      };
      const selfOut = { email: { $ne: session.user.email } };
      const mapUser = (u: any, kind: string) => ({
        entityType: 'user', entityId: String(u._id), role: u.role, kind, name: u.name, email: u.email,
        image: u.image || '', specialization: u.specialization || u.department || '',
      });
      let recipients: any[] = [];
      let total = 0;
      if (kindParam === 'patient') {
        if (role !== 'admin' && role !== 'doctor' && role !== 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const f = { ...live, ...nameMatch(['patientId']) };
        const [rows, n] = await Promise.all([
          Patient.find(f).select('name email patientId').sort({ name: 1 }).skip(page * limit).limit(limit).lean(),
          Patient.countDocuments(f),
        ]);
        total = n;
        recipients = (rows as any[]).map((pt) => ({
          entityType: 'patient', entityId: String(pt._id), role: 'patient', kind: 'patient', name: pt.name, email: pt.email, image: '', specialization: pt.patientId || '',
        }));
      } else if (userFilters[kindParam]) {
        const f = { ...userFilters[kindParam], ...live, ...selfOut, ...nameMatch() };
        const [rows, n] = await Promise.all([
          User.find(f).select('name email role image specialization department').sort({ name: 1 }).skip(page * limit).limit(limit).lean(),
          User.countDocuments(f),
        ]);
        total = n;
        recipients = (rows as any[]).map((u) => mapUser(u, kindParam));
      } else {
        return NextResponse.json({ error: 'Unknown group' }, { status: 400 });
      }
      let counts: Record<string, number> | undefined;
      if (page === 0 && !q0) {
        const keys = Object.keys(userFilters).filter((k) => k !== 'admin');
        const [pc, ...uc] = await Promise.all([
          Patient.countDocuments(live),
          ...keys.map((k) => User.countDocuments({ ...userFilters[k], ...live, ...selfOut })),
        ]);
        counts = { patient: pc, ...Object.fromEntries(keys.map((k, i) => [k, uc[i]])) };
      }
      return NextResponse.json({ recipients, total, hasMore: (page + 1) * limit < total, counts });
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
