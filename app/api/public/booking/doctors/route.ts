import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getEffectiveDoctorSchedule } from '@/lib/appointmentSlotting';
import { APPROVED_DOCTOR, listPublicDoctors, shapePublicDoctor, type PublicDoctorDoc } from '@/lib/public-doctors';

export const dynamic = 'force-dynamic';

/**
 * Public marketplace list of doctors/herbalists with their consultation fee.
 * GET /api/public/booking/doctors            -> list
 * GET /api/public/booking/doctors?id=<id>    -> one doctor
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      await dbConnect();
      const doc = await User.findOne({ ...APPROVED_DOCTOR, _id: id })
        .select('_id name email specialization department consultationFee rating ratingCount yearsOfExperience languages qualifications bio gender practitionerType approvalStatus currency')
        .lean();
      if (!doc) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      const sched = await getEffectiveDoctorSchedule(id);
      return NextResponse.json(shapePublicDoctor(doc as unknown as PublicDoctorDoc, sched.slotDurationMinutes));
    }
    const list = await listPublicDoctors();
    return NextResponse.json(list, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    });
  } catch (e) {
    console.error('GET /api/public/booking/doctors', e);
    return NextResponse.json({ error: 'Failed to load doctors' }, { status: 500 });
  }
}
