import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import User from '@/models/User';
import {
  computeDoctorDaySlots,
  getEffectiveDoctorSchedule,
  getPracticeWorkingHoursFallback,
} from '@/lib/appointmentSlotting';

const CACHE_TTL_MS = 90_000;
let doctorsContextCache: { until: number; appointmentEnabled: boolean; text: string } | null = null;

function utcYmd(offsetDaysFromToday: number): string {
  const d = new Date();
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDaysFromToday));
  const y = u.getUTCFullYear();
  const m = String(u.getUTCMonth() + 1).padStart(2, '0');
  const day = String(u.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function truncateBlock(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * Builds text for the public landing assistant: doctors who allow website booking plus
 * a short horizon of bookable slot times (same rules as /api/public/booking/slots).
 * Cached briefly to limit DB load on busy chat.
 */
export async function getLandingChatDoctorsContext(options: {
  origin: string;
  appointmentRequestEnabled: boolean;
  /** Calendar days ahead to scan per doctor (UTC YYYY-MM-DD). */
  horizonDays?: number;
  maxDoctors?: number;
  maxChars?: number;
}): Promise<string> {
  const horizonDays = Math.min(14, Math.max(1, options.horizonDays ?? 5));
  const maxDoctors = Math.min(60, Math.max(1, options.maxDoctors ?? 28));
  const maxChars = Math.min(24_000, Math.max(2000, options.maxChars ?? 14_000));
  const { origin, appointmentRequestEnabled } = options;

  const now = Date.now();
  if (
    doctorsContextCache &&
    doctorsContextCache.until > now &&
    doctorsContextCache.appointmentEnabled === appointmentRequestEnabled
  ) {
    return doctorsContextCache.text;
  }

  const baseOrigin = origin.replace(/\/$/, '');
  const bookingUrl = `${baseOrigin}/request-appointment`;

  if (!appointmentRequestEnabled) {
    const text = [
      `Online appointment requests are disabled in hospital website settings.`,
      `Do not describe specific bookable time slots or direct visitors to ${bookingUrl} for booking — that flow is off.`,
      `If someone asks which doctor to see, tell them you cannot access live scheduling and they should contact the hospital using phone or email from the website contact section.`,
    ].join('\n');
    doctorsContextCache = {
      until: now + CACHE_TTL_MS,
      appointmentEnabled: appointmentRequestEnabled,
      text,
    };
    return text;
  }

  await dbConnect();

  const practiceFallback = await getPracticeWorkingHoursFallback();

  const doctorUsers = await User.find({ role: 'doctor' })
    .select('_id name email specialization department qualifications bio')
    .sort({ name: 1 })
    .limit(maxDoctors * 3)
    .lean();

  type Row = {
    id: string;
    name: string;
    specialization: string;
    department: string;
    slotMinutes: number;
    extra: string;
    slotLines: string[];
  };

  const rows: Row[] = [];

  for (const raw of doctorUsers) {
    if (rows.length >= maxDoctors) break;
    const u = raw as {
      _id: { toString: () => string };
      name: string;
      email: string;
      specialization?: string;
      department?: string;
      qualifications?: string[];
      bio?: string;
    };
    const id = u._id.toString();
    const sched = await getEffectiveDoctorSchedule(id, { practiceFallback });
    if (!sched.websiteBookingEnabled) continue;

    const qual = Array.isArray(u.qualifications) ? u.qualifications.filter(Boolean).slice(0, 4).join(', ') : '';
    const bioShort = (u.bio || '').trim().slice(0, 160);

    const slotMinutes = sched.slotDurationMinutes;

    const preloadedDoctor = {
      _id: u._id as mongoose.Types.ObjectId,
      name: u.name,
      email: u.email,
    };
    const dayResults = await Promise.all(
      Array.from({ length: horizonDays }, (_, i) =>
        computeDoctorDaySlots(id, utcYmd(i), {
          forPublicWebsite: true,
          preloaded: { doctor: preloadedDoctor, schedule: sched },
        })
      )
    );

    const slotLines: string[] = [];
    for (let i = 0; i < horizonDays; i++) {
      const dateStr = utcYmd(i);
      const result = dayResults[i];
      if (!result || !result.ok) continue;
      const avail = result.slots.filter((s) => s.available).map((s) => s.time);
      if (avail.length === 0) continue;
      const preview = avail.slice(0, 12).join(', ');
      slotLines.push(
        `    ${dateStr}: ${preview}${avail.length > 12 ? ` (+${avail.length - 12} more that day)` : ''}`
      );
    }

    const extraParts: string[] = [];
    if (qual) extraParts.push(`Qualifications (short): ${qual}`);
    if (bioShort) extraParts.push(`Bio (snippet): ${bioShort}${(u.bio || '').trim().length > 160 ? '…' : ''}`);

    rows.push({
      id,
      name: u.name.trim() || 'Doctor',
      specialization: (u.specialization || '').trim(),
      department: (u.department || '').trim(),
      slotMinutes,
      extra: extraParts.join(' | '),
      slotLines,
    });
  }

  let text = '';
  text += `BOOKING PAGE (visitor self-service): ${bookingUrl}\n`;
  text += `Dates below use UTC calendar day YYYY-MM-DD (same as the booking calendar). Snapshot refreshes often but can lag ~1–2 minutes; live slots are always on the booking page.\n`;
  text += `Only recommend doctors listed below (they have "website booking" enabled). Match specialization / department / qualifications loosely to the visitor's concern — this is triage guidance only, not diagnosis.\n\n`;

  if (rows.length === 0) {
    text += `No doctors are currently enabled for website booking. Do not invent providers. Suggest contacting the hospital via published contact details.\n`;
  } else {
    for (const r of rows) {
      const spec = r.specialization || '—';
      const dept = r.department ? ` | Department: ${r.department}` : '';
      const extra = r.extra ? `\n    ${r.extra}` : '';
      const slotDur = `Appointment slot length (approx): ${r.slotMinutes} minutes`;
      text += `- ${r.name}  |  doctorId=${r.id}  |  ${slotDur}  |  Specialization: ${spec}${dept}${extra}\n`;
      if (r.slotLines.length > 0) {
        text += `  Available start times (booked slots excluded in this snapshot):\n${r.slotLines.join('\n')}\n`;
      } else {
        text += `  No free slots in the next ${horizonDays} UTC days in this snapshot (schedule may still allow other days — use booking page).\n`;
      }
      text += '\n';
      if (text.length > maxChars) break;
    }
  }

  const out = truncateBlock(text, maxChars);
  doctorsContextCache = {
    until: Date.now() + CACHE_TTL_MS,
    appointmentEnabled: appointmentRequestEnabled,
    text: out,
  };
  return out;
}
