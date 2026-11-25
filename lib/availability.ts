import { zonedToInstant, safeTimeZone } from '@/lib/timezone';

export const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Weekday = (typeof WEEK)[number];
export type TimeRange = { start: string; end: string };
export type DayPlan = { enabled: boolean; ranges: TimeRange[] };
export type Weekly = Record<Weekday, DayPlan>;
export type TimeOff = { from: string; to: string; reason?: string };
export type DateOverride = { date: string; available: boolean; ranges: TimeRange[]; note?: string };

export type AvailabilitySettings = {
  slotDurationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  maxPerDay: number;
  paused: boolean;
  pausedUntil: string | null; // ISO
  pauseMessage: string;
  weekly: Weekly;
  timeOff: TimeOff[];
  dateOverrides: DateOverride[];
  websiteBookingEnabled: boolean;
};

const HHMM = /^(\d{1,2}):(\d{2})$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const normTime = (t: unknown): string => {
  const m = HHMM.exec(String(t || '').trim());
  if (!m) return '';
  const h = Math.min(23, Math.max(0, +m[1]));
  const mi = Math.min(59, Math.max(0, +m[2]));
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
};
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/** Clean ranges: valid, start < end, sorted, overlapping/touching ranges merged. */
export function cleanRanges(input: unknown): TimeRange[] {
  const list = Array.isArray(input) ? input : [];
  const out: TimeRange[] = [];
  for (const r of list) {
    const start = normTime((r as any)?.start);
    const end = normTime((r as any)?.end);
    if (start && end && toMin(end) > toMin(start)) out.push({ start, end });
  }
  out.sort((a, b) => toMin(a.start) - toMin(b.start));
  const merged: TimeRange[] = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && toMin(r.start) <= toMin(last.end)) { if (toMin(r.end) > toMin(last.end)) last.end = r.end; }
    else merged.push({ ...r });
  }
  return merged;
}

export function emptyWeekly(): Weekly {
  return Object.fromEntries(WEEK.map((d) => [d, { enabled: false, ranges: [] }])) as unknown as Weekly;
}

/** Week built from the old single start/end + days, so existing providers keep working unchanged. */
export function weeklyFromLegacy(wh: { start?: string; end?: string; days?: string[] }): Weekly {
  const w = emptyWeekly();
  const start = normTime(wh.start) || '09:00';
  const end = normTime(wh.end) || '17:00';
  for (const d of wh.days || []) if ((WEEK as readonly string[]).includes(d.toLowerCase())) w[d.toLowerCase() as Weekday] = { enabled: true, ranges: [{ start, end }] };
  return w;
}

export function cleanWeekly(input: any): Weekly {
  const w = emptyWeekly();
  for (const d of WEEK) {
    const day = input?.[d];
    if (!day) continue;
    const ranges = cleanRanges(day.ranges);
    w[d] = { enabled: Boolean(day.enabled) && ranges.length > 0, ranges };
  }
  return w;
}

export function cleanTimeOff(input: unknown): TimeOff[] {
  return (Array.isArray(input) ? input : [])
    .map((t: any) => ({ from: String(t?.from || ''), to: String(t?.to || t?.from || ''), reason: String(t?.reason || '').slice(0, 120) }))
    .filter((t) => YMD.test(t.from) && YMD.test(t.to) && t.to >= t.from)
    .slice(0, 100);
}

export function cleanOverrides(input: unknown): DateOverride[] {
  return (Array.isArray(input) ? input : [])
    .map((o: any) => ({ date: String(o?.date || ''), available: Boolean(o?.available), ranges: cleanRanges(o?.ranges), note: String(o?.note || '').slice(0, 120) }))
    .filter((o) => YMD.test(o.date))
    .map((o) => (o.available && o.ranges.length === 0 ? { ...o, available: false } : o))
    .slice(0, 200);
}

export function weekdayOf(ymd: string): Weekday {
  const [y, m, d] = ymd.split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0 = Sunday
  return WEEK[(js + 6) % 7];
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n, 12));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function todayIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: safeTimeZone(tz) }).format(now);
}

export type DayResult = { ranges: TimeRange[]; reason?: string; message?: string };

/** What hours apply on a given calendar day (in the provider's own time zone), and why if there are none. */
export function hoursForDate(s: AvailabilitySettings, ymd: string, tz: string, now = new Date()): DayResult {
  if (s.paused && (!s.pausedUntil || new Date(s.pausedUntil).getTime() > now.getTime())) {
    return { ranges: [], reason: 'paused', message: s.pauseMessage || 'Not accepting bookings right now.' };
  }
  const today = todayIn(tz, now);
  if (ymd < today) return { ranges: [], reason: 'past' };
  if (ymd > addDays(today, s.maxAdvanceDays)) return { ranges: [], reason: 'too-far', message: `Bookings open up to ${s.maxAdvanceDays} days ahead.` };
  const off = s.timeOff.find((t) => ymd >= t.from && ymd <= t.to);
  if (off) return { ranges: [], reason: 'time-off', message: off.reason || 'Away on this date.' };
  const ov = s.dateOverrides.find((o) => o.date === ymd);
  if (ov) return ov.available ? { ranges: ov.ranges } : { ranges: [], reason: 'day-off', message: ov.note || 'Not available on this date.' };
  const plan = s.weekly[weekdayOf(ymd)];
  if (!plan?.enabled || !plan.ranges.length) return { ranges: [], reason: 'not-working' };
  return { ranges: plan.ranges };
}

/** Start times: each range cut into slots of `duration`, with `buffer` minutes kept between consultations. */
export function slotTimes(ranges: TimeRange[], duration: number, buffer: number): string[] {
  const out: string[] = [];
  const step = Math.max(5, duration + Math.max(0, buffer));
  for (const r of ranges) {
    for (let t = toMin(r.start); t + duration <= toMin(r.end); t += step) out.push(fromMin(t));
  }
  return out;
}

/** True when a slot is too soon to book (inside the minimum notice). */
export function tooSoon(ymd: string, time: string, tz: string, minNoticeHours: number, now = new Date()): boolean {
  const at = zonedToInstant(ymd, time, tz).getTime();
  return at < now.getTime() + Math.max(0, minNoticeHours) * 3600_000;
}

export function defaultSettings(): AvailabilitySettings {
  return {
    slotDurationMinutes: 30, bufferMinutes: 0, minNoticeHours: 0, maxAdvanceDays: 90, maxPerDay: 0,
    paused: false, pausedUntil: null, pauseMessage: '',
    weekly: weeklyFromLegacy({ start: '09:00', end: '17:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }),
    timeOff: [], dateOverrides: [], websiteBookingEnabled: true,
  };
}

/** Plain-English summary, e.g. "Mon–Fri 09:00–17:00 · Sat 09:00–12:00". */
export function summarizeWeek(w: Weekly): string {
  const label: Record<Weekday, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
  const groups: { days: Weekday[]; text: string }[] = [];
  for (const d of WEEK) {
    const p = w[d];
    if (!p?.enabled) continue;
    const text = p.ranges.map((r) => `${r.start}–${r.end}`).join(', ');
    const last = groups[groups.length - 1];
    if (last && last.text === text && WEEK.indexOf(last.days[last.days.length - 1]) === WEEK.indexOf(d) - 1) last.days.push(d);
    else groups.push({ days: [d], text });
  }
  if (!groups.length) return 'No working hours set';
  return groups.map((g) => `${g.days.length > 1 ? `${label[g.days[0]]}–${label[g.days[g.days.length - 1]]}` : label[g.days[0]]} ${g.text}`).join(' · ');
}
