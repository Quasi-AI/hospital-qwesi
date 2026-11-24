import dbConnect from '@/lib/mongodb';
import { normalizeCurrency } from '@/lib/practitioner-currency';
import User from '@/models/User';
import DoctorSchedule from '@/models/DoctorSchedule';

const PUBLIC_FIELDS =
  '_id name email specialization department consultationFee rating ratingCount yearsOfExperience languages qualifications bio gender practitionerType approvalStatus currency';

// Every doctor is listed (verified or not) except ones an admin has rejected.
// A provider who is on a FREE consultation AND has not finished their profile is switched off for patients, so people do not
// keep booking free consultations with unfinished profiles. They come back automatically once the profile is completed.
export const FREE_UNFINISHED_PROVIDER = {
  approvalStatus: 'pending_profile',
  $or: [{ consultationFee: { $lte: 0 } }, { consultationFee: { $exists: false } }, { consultationFee: null }],
};
export const APPROVED_DOCTOR = { role: 'doctor', approvalStatus: { $ne: 'rejected' }, $nor: [FREE_UNFINISHED_PROVIDER] };

export const isFreeUnfinishedProvider = (u: { approvalStatus?: string; consultationFee?: number | null }) =>
  u.approvalStatus === 'pending_profile' && !(Number(u.consultationFee) > 0);

export type PublicDoctorDoc = {
  _id: { toString: () => string };
  name: string; email: string; specialization?: string; department?: string;
  consultationFee?: number; rating?: number; ratingCount?: number; yearsOfExperience?: number;
  languages?: string[]; qualifications?: string[]; bio?: string; gender?: string;
  practitionerType?: string; approvalStatus?: string; currency?: string;
};

export function shapePublicDoctor(u: PublicDoctorDoc, slotDurationMinutes: number) {
  const id = u._id.toString();
  return {
    id,
    name: u.name,
    email: u.email,
    specialization: u.specialization || '',
    department: u.department || '',
    consultationFee: Number(u.consultationFee || 0),
    currency: normalizeCurrency(u.currency),
    rating: u.rating ?? null,
    ratingCount: u.ratingCount ?? 0,
    yearsOfExperience: u.yearsOfExperience ?? null,
    languages: u.languages || [],
    qualifications: u.qualifications || [],
    bio: u.bio || '',
    gender: u.gender || '',
    verified: u.approvalStatus === 'approved',
    practitionerType: u.practitionerType === 'herbalist' ? ('herbalist' as const) : ('doctor' as const),
    photoUrl: `/api/public/doctors/${id}/photo`,
    slotDurationMinutes,
  };
}

export type PublicDoctor = ReturnType<typeof shapePublicDoctor>;

let cache: { at: number; data: PublicDoctor[] } | null = null;
const TTL_MS = 30_000;

/** Whole marketplace list in 2 queries (users + schedules), cached for 30s per server instance. */
export async function listPublicDoctors(): Promise<PublicDoctor[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  await dbConnect();
  const [doctors, schedules] = await Promise.all([
    User.find(APPROVED_DOCTOR).select(PUBLIC_FIELDS).sort({ name: 1 }).lean(),
    DoctorSchedule.find({}).select('doctorId slotDurationMinutes websiteBookingEnabled').lean(),
  ]);
  const byDoctor = new Map<string, { slotDurationMinutes?: number; websiteBookingEnabled?: boolean }>();
  for (const sc of schedules as unknown as { doctorId: { toString: () => string }; slotDurationMinutes?: number; websiteBookingEnabled?: boolean }[]) {
    byDoctor.set(sc.doctorId.toString(), sc);
  }
  const data: PublicDoctor[] = [];
  for (const d of doctors) {
    const u = d as unknown as PublicDoctorDoc;
    const sc = byDoctor.get(u._id.toString());
    if (sc && sc.websiteBookingEnabled === false) continue;
    data.push(shapePublicDoctor(u, Math.min(180, Math.max(5, sc?.slotDurationMinutes ?? 30))));
  }
  cache = { at: Date.now(), data };
  return data;
}
