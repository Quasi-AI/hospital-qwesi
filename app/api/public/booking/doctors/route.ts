import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getEffectiveDoctorSchedule } from '@/lib/appointmentSlotting';

/** Public list of doctors available for online booking */
export async function GET() {
  try {
    await dbConnect();
    const doctors = await User.find({ role: 'doctor' })
      .select('_id name email specialization department')
      .sort({ name: 1 })
      .lean();

    const list = [];
    for (const d of doctors) {
      const u = d as { _id: { toString: () => string }; name: string; email: string; specialization?: string; department?: string };
      const id = u._id.toString();
      const sched = await getEffectiveDoctorSchedule(id);
      if (!sched.websiteBookingEnabled) continue;
      list.push({
        id,
        name: u.name,
        email: u.email,
        specialization: u.specialization || '',
        department: u.department || '',
        slotDurationMinutes: sched.slotDurationMinutes,
      });
    }

    return NextResponse.json(list);
  } catch (e) {
    console.error('GET /api/public/booking/doctors', e);
    return NextResponse.json({ error: 'Failed to load doctors' }, { status: 500 });
  }
}
