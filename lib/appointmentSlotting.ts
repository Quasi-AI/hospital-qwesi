import mongoose from 'mongoose';
import User from '@/models/User';
import Settings from '@/models/Settings';
import DoctorSchedule from '@/models/DoctorSchedule';
import Appointment from '@/models/Appointment';
import { isProviderApproved } from '@/lib/providerApproval';
import { safeTimeZone } from '@/lib/timezone';
import {
  type AvailabilitySettings, WEEK, cleanWeekly, cleanTimeOff, cleanOverrides, weeklyFromLegacy,
  hoursForDate, slotTimes, tooSoon,
} from '@/lib/availability';

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export function normalizeTimeLabel(t: string): string {
  const m = String(t || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function timeToMinutes(t: string): number {
  const n = normalizeTimeLabel(t);
  const [h, m] = n.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlotTimes(start: string, end: string, slotMins: number): string[] {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (e <= s || slotMins < 1) return [];
  const out: string[] = [];
  for (let t = s; t + slotMins <= e; t += slotMins) {
    out.push(minutesToTime(t));
  }
  return out;
}

export function dayKeyFromYmd(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return 'monday';
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(Date.UTC(y, mo, d, 12, 0, 0));
  return WEEKDAYS[dt.getUTCDay()];
}

export type WorkingHoursShape = { start: string; end: string; days: string[] };

export async function getPracticeWorkingHoursFallback(): Promise<WorkingHoursShape> {
  const s = await Settings.findOne().lean();
  const wh = (s as { workingHours?: WorkingHoursShape } | null)?.workingHours;
  return {
    start: wh?.start || '09:00',
    end: wh?.end || '17:00',
    days:
      Array.isArray(wh?.days) && wh!.days.length > 0
        ? wh!.days
        : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  };
}

export type EffectiveDoctorSchedule = {
  slotDurationMinutes: number;
  websiteBookingEnabled: boolean;
  workingHours: WorkingHoursShape;
  settings: AvailabilitySettings;
};

function buildSettings(d: any, wh: WorkingHoursShape, slot: number, web: boolean): AvailabilitySettings {
  const weekly = d?.weekly && typeof d.weekly === 'object' && Object.keys(d.weekly).length ? cleanWeekly(d.weekly) : weeklyFromLegacy(wh);
  return {
    slotDurationMinutes: slot,
    bufferMinutes: Math.min(120, Math.max(0, Number(d?.bufferMinutes) || 0)),
    minNoticeHours: Math.min(720, Math.max(0, Number(d?.minNoticeHours) || 0)),
    maxAdvanceDays: Math.min(730, Math.max(1, Number(d?.maxAdvanceDays) || 90)),
    maxPerDay: Math.min(200, Math.max(0, Number(d?.maxPerDay) || 0)),
    paused: Boolean(d?.paused),
    pausedUntil: d?.pausedUntil ? new Date(d.pausedUntil).toISOString() : null,
    pauseMessage: String(d?.pauseMessage || ''),
    weekly,
    timeOff: cleanTimeOff(d?.timeOff),
    dateOverrides: cleanOverrides(d?.dateOverrides),
    websiteBookingEnabled: web,
  };
}

/** Old single start/end/days view, derived from the weekly plan so older screens keep working. */
function legacyFromWeekly(weekly: AvailabilitySettings['weekly'], fb: WorkingHoursShape): WorkingHoursShape {
  const days = WEEK.filter((d) => weekly[d].enabled);
  if (!days.length) return { start: fb.start, end: fb.end, days: [] };
  const all = days.flatMap((d) => weekly[d].ranges);
  return {
    days: [...days],
    start: all.map((r) => r.start).sort()[0],
    end: all.map((r) => r.end).sort().slice(-1)[0],
  };
}

export async function getEffectiveDoctorSchedule(
  doctorId: string,
  opts?: { practiceFallback?: WorkingHoursShape }
): Promise<EffectiveDoctorSchedule> {
  let fallback = opts?.practiceFallback;
  const ensureFallback = async () => {
    if (!fallback) fallback = await getPracticeWorkingHoursFallback();
    return fallback;
  };

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    const f = await ensureFallback();
    return {
      slotDurationMinutes: 30,
      websiteBookingEnabled: true,
      workingHours: f,
      settings: buildSettings(null, f, 30, true),
    };
  }
  const doc = await DoctorSchedule.findOne({
    doctorId: new mongoose.Types.ObjectId(doctorId),
  }).lean();
  if (!doc) {
    const f = await ensureFallback();
    return {
      slotDurationMinutes: 30,
      websiteBookingEnabled: true,
      workingHours: f,
      settings: buildSettings(null, f, 30, true),
    };
  }
  const d = doc as {
    slotDurationMinutes?: number;
    websiteBookingEnabled?: boolean;
    workingHours?: Partial<WorkingHoursShape>;
  };
  const fb = await ensureFallback();
  const slot = Math.min(180, Math.max(5, d.slotDurationMinutes ?? 30));
  const web = d.websiteBookingEnabled !== false;
  const legacy: WorkingHoursShape = {
      start: d.workingHours?.start || fb.start,
      end: d.workingHours?.end || fb.end,
      days:
        Array.isArray(d.workingHours?.days) && d.workingHours!.days!.length > 0
          ? (d.workingHours!.days as string[])
          : fb.days,
  };
  const settings = buildSettings(doc, legacy, slot, web);
  const hasWeekly = (doc as any).weekly && Object.keys((doc as any).weekly).length;
  return {
    slotDurationMinutes: slot,
    websiteBookingEnabled: web,
    workingHours: hasWeekly ? legacyFromWeekly(settings.weekly, fb) : legacy,
    settings,
  };
}

function appointmentDayStartUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Store and compare calendar days in UTC. Coerces HTML date strings and mixed DB shapes. */
export function normalizeAppointmentDateForStorage(input: unknown): Date {
  if (input == null || input === '') {
    return new Date(NaN);
  }
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return input;
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
  }
  const s = String(input).trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (ymd) {
    return new Date(`${ymd[1]}-${ymd[2]}-${ymd[3]}T00:00:00.000Z`);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return d;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export async function loadBookedTimesForDoctorDay(
  doctorId: string,
  doctorEmail: string,
  doctorName: string,
  dateStr: string,
  excludeAppointmentId?: string
): Promise<Set<string>> {
  const dayStart = appointmentDayStartUtc(dateStr);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const oid = mongoose.Types.ObjectId.isValid(doctorId) ? new mongoose.Types.ObjectId(doctorId) : null;

  const doctorOr: Record<string, unknown>[] = [];
  if (oid) doctorOr.push({ doctorId: oid });
  if (doctorEmail) doctorOr.push({ doctorEmail: doctorEmail.toLowerCase().trim() });
  if (doctorName) doctorOr.push({ doctorName: doctorName.trim() });
  if (doctorOr.length === 0) {
    return new Set();
  }

  // Same calendar day: BSON Date range, exact UTC midnight, or legacy string "YYYY-MM-DD" from raw inserts
  const dateOr: Record<string, unknown>[] = [
    { appointmentDate: { $gte: dayStart, $lt: dayEnd } },
    { appointmentDate: dayStart },
    { appointmentDate: dateStr },
  ];

  const query: Record<string, unknown> = {
    status: { $nin: ['cancelled'] },
    $and: [{ $or: doctorOr }, { $or: dateOr }],
  };
  if (excludeAppointmentId && mongoose.Types.ObjectId.isValid(excludeAppointmentId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeAppointmentId) };
  }

  const rows = await Appointment.find(query).select('appointmentTime').lean();
  const taken = new Set<string>();
  for (const r of rows) {
    const row = r as { appointmentTime?: string };
    const n = normalizeTimeLabel(row.appointmentTime || '');
    if (n) taken.add(n);
  }
  return taken;
}

export type DaySlot = { time: string; available: boolean };

export async function computeDoctorDaySlots(
  doctorId: string,
  dateStr: string,
  options?: {
    forPublicWebsite?: boolean;
    excludeAppointmentId?: string;
    /** Skip per-day User + schedule lookups when building many days for the same doctor (e.g. landing chat). */
    preloaded?: {
      doctor: { _id: mongoose.Types.ObjectId; name: string; email: string; timeZone?: string };
      schedule: EffectiveDoctorSchedule;
    };
  }
): Promise<{
  ok: true;
  doctor: { id: string; name: string; email: string };
  /** Time zone the slot times are written in (the doctor's) */
  timeZone: string;
  slotDurationMinutes: number;
  slots: DaySlot[];
  unavailableReason?: string;
  unavailableMessage?: string;
} | { ok: false; error: string; status: number }> {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return { ok: false, error: 'Invalid doctor', status: 400 };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ok: false, error: 'Invalid date', status: 400 };
  }

  let d: { _id: mongoose.Types.ObjectId; name: string; email: string; timeZone?: string };
  let sched: EffectiveDoctorSchedule;

  if (options?.preloaded) {
    const pl = options.preloaded;
    if (pl.doctor._id.toString() !== doctorId) {
      return { ok: false, error: 'Invalid doctor', status: 400 };
    }
    d = pl.doctor;
    sched = pl.schedule;
  } else {
    const doctor = await User.findById(doctorId)
      .select('name email role approvalStatus hasImage licenseNumber licenseCertificate timeZone')
      .lean();
    if (!doctor || (doctor as { role?: string }).role !== 'doctor') {
      return { ok: false, error: 'Doctor not found', status: 404 };
    }
    if (
      options?.forPublicWebsite &&
      (doctor as { approvalStatus?: string }).approvalStatus === 'rejected'
    ) {
      return { ok: false, error: 'Doctor is not available for online booking', status: 403 };
    }

    d = doctor as { _id: mongoose.Types.ObjectId; name: string; email: string; timeZone?: string };
    sched = await getEffectiveDoctorSchedule(doctorId);
  }

  if (options?.forPublicWebsite && !sched.websiteBookingEnabled) {
    return { ok: false, error: 'Online booking disabled for this provider', status: 403 };
  }

  const tz = safeTimeZone(d.timeZone);
  const base = { ok: true as const, doctor: { id: d._id.toString(), name: d.name, email: d.email }, timeZone: tz, slotDurationMinutes: sched.slotDurationMinutes };
  const day = hoursForDate(sched.settings, dateStr, tz);
  if (!day.ranges.length) {
    return { ...base, slots: [], unavailableReason: day.reason, unavailableMessage: day.message };
  }
  const times = slotTimes(day.ranges, sched.slotDurationMinutes, sched.settings.bufferMinutes);

  const booked = await loadBookedTimesForDoctorDay(
    doctorId,
    d.email,
    d.name,
    dateStr,
    options?.excludeAppointmentId
  );

  const full = sched.settings.maxPerDay > 0 && booked.size >= sched.settings.maxPerDay;
  const slots: DaySlot[] = times.map((time) => ({
    time,
    available: !full && !booked.has(time) && !tooSoon(dateStr, time, tz, sched.settings.minNoticeHours),
  }));

  return {
    ok: true,
    doctor: { id: d._id.toString(), name: d.name, email: d.email },
    timeZone: tz,
    slotDurationMinutes: sched.slotDurationMinutes,
    slots,
  };
}

export async function isSlotAvailableForDoctor(
  doctorId: string,
  dateStr: string,
  time: string
): Promise<boolean> {
  const normalized = normalizeTimeLabel(time);
  if (!normalized) return false;
  const result = await computeDoctorDaySlots(doctorId, dateStr);
  if (!result.ok) return false;
  const slot = result.slots.find((s) => s.time === normalized);
  return !!slot?.available;
}
