import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getEffectiveDoctorSchedule } from '@/lib/appointmentSlotting';

export const dynamic = 'force-dynamic';

const PUBLIC_FIELDS =
  '_id name email specialization department consultationFee rating ratingCount yearsOfExperience languages qualifications bio gender practitionerType';

const APPROVED_DOCTOR = {
  role: 'doctor',
  approvalStatus: 'approved',
  hasImage: true,
  licenseNumber: { $exists: true, $ne: '' },
  'licenseCertificate.data': { $exists: true, $ne: '' },
};

type PublicDoctorDoc = {
  _id: { toString: () => string };
  name: string;
  email: string;
  specialization?: string;
  department?: string;
  consultationFee?: number;
  rating?: number;
  ratingCount?: number;
  yearsOfExperience?: number;
  languages?: string[];
  qualifications?: string[];
  bio?: string;
  gender?: string;
  practitionerType?: string;
};

function shape(u: PublicDoctorDoc, slotDurationMinutes: number) {
  const id = u._id.toString();
  return {
    id,
    name: u.name,
    email: u.email,
    specialization: u.specialization || '',
    department: u.department || '',
    consultationFee: Number(u.consultationFee || 0),
    currency: 'GHS',
    rating: u.rating ?? null,
    ratingCount: u.ratingCount ?? 0,
    yearsOfExperience: u.yearsOfExperience ?? null,
    languages: u.languages || [],
    qualifications: u.qualifications || [],
    bio: u.bio || '',
    gender: u.gender || '',
    practitionerType: u.practitionerType === 'herbalist' ? 'herbalist' : 'doctor',
    photoUrl: `/api/public/doctors/${id}/photo`,
    slotDurationMinutes,
  };
}

/**
 * Public marketplace list of verified doctors with their consultation fee.
 * GET /api/public/booking/doctors            -> list
 * GET /api/public/booking/doctors?id=<id>    -> one doctor
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const id = request.nextUrl.searchParams.get('id');

    if (id) {
      const doc = await User.findOne({ ...APPROVED_DOCTOR, _id: id }).select(PUBLIC_FIELDS).lean();
      if (!doc) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      const sched = await getEffectiveDoctorSchedule(id);
      return NextResponse.json(shape(doc as unknown as PublicDoctorDoc, sched.slotDurationMinutes));
    }

    const doctors = await User.find(APPROVED_DOCTOR).select(PUBLIC_FIELDS).sort({ name: 1 }).lean();

    const list = [];
    for (const d of doctors) {
      const u = d as unknown as PublicDoctorDoc;
      const sched = await getEffectiveDoctorSchedule(u._id.toString());
      if (!sched.websiteBookingEnabled) continue;
      list.push(shape(u, sched.slotDurationMinutes));
    }

    return NextResponse.json(list, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    });
  } catch (e) {
    console.error('GET /api/public/booking/doctors', e);
    return NextResponse.json({ error: 'Failed to load doctors' }, { status: 500 });
  }
}
