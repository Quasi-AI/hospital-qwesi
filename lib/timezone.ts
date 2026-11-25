/**
 * Time zones. A doctor's working hours and every appointment are stored as a wall-clock time in the DOCTOR's
 * time zone (appointmentDate = that calendar day, appointmentTime = HH:MM there). Everyone else sees the same
 * moment converted to THEIR own time zone. Works in the browser and on the server (Intl only, no dependencies).
 */
export const DEFAULT_TIME_ZONE = 'Africa/Accra';

export type TimeZoneOption = { id: string; label: string; region: string };

/** Friendly list, grouped by region/country. Any other IANA zone is still accepted. */
export const TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { id: 'Africa/Accra', label: 'Ghana (Accra)', region: 'Africa' },
  { id: 'Africa/Lagos', label: 'Nigeria (Lagos)', region: 'Africa' },
  { id: 'Africa/Abidjan', label: "Côte d'Ivoire (Abidjan)", region: 'Africa' },
  { id: 'Africa/Dakar', label: 'Senegal (Dakar)', region: 'Africa' },
  { id: 'Africa/Douala', label: 'Cameroon (Douala)', region: 'Africa' },
  { id: 'Africa/Nairobi', label: 'Kenya (Nairobi)', region: 'Africa' },
  { id: 'Africa/Kampala', label: 'Uganda (Kampala)', region: 'Africa' },
  { id: 'Africa/Dar_es_Salaam', label: 'Tanzania (Dar es Salaam)', region: 'Africa' },
  { id: 'Africa/Addis_Ababa', label: 'Ethiopia (Addis Ababa)', region: 'Africa' },
  { id: 'Africa/Johannesburg', label: 'South Africa (Johannesburg)', region: 'Africa' },
  { id: 'Africa/Harare', label: 'Zimbabwe (Harare)', region: 'Africa' },
  { id: 'Africa/Lusaka', label: 'Zambia (Lusaka)', region: 'Africa' },
  { id: 'Africa/Cairo', label: 'Egypt (Cairo)', region: 'Africa' },
  { id: 'Africa/Casablanca', label: 'Morocco (Casablanca)', region: 'Africa' },
  { id: 'America/New_York', label: 'USA – Eastern (New York)', region: 'Americas' },
  { id: 'America/Chicago', label: 'USA – Central (Chicago)', region: 'Americas' },
  { id: 'America/Denver', label: 'USA – Mountain (Denver)', region: 'Americas' },
  { id: 'America/Los_Angeles', label: 'USA – Pacific (Los Angeles)', region: 'Americas' },
  { id: 'America/Anchorage', label: 'USA – Alaska (Anchorage)', region: 'Americas' },
  { id: 'Pacific/Honolulu', label: 'USA – Hawaii (Honolulu)', region: 'Americas' },
  { id: 'America/Toronto', label: 'Canada – Eastern (Toronto)', region: 'Americas' },
  { id: 'America/Vancouver', label: 'Canada – Pacific (Vancouver)', region: 'Americas' },
  { id: 'America/Sao_Paulo', label: 'Brazil (São Paulo)', region: 'Americas' },
  { id: 'America/Mexico_City', label: 'Mexico (Mexico City)', region: 'Americas' },
  { id: 'America/Jamaica', label: 'Jamaica (Kingston)', region: 'Americas' },
  { id: 'Europe/London', label: 'United Kingdom (London)', region: 'Europe' },
  { id: 'Europe/Dublin', label: 'Ireland (Dublin)', region: 'Europe' },
  { id: 'Europe/Paris', label: 'France (Paris)', region: 'Europe' },
  { id: 'Europe/Berlin', label: 'Germany (Berlin)', region: 'Europe' },
  { id: 'Europe/Madrid', label: 'Spain (Madrid)', region: 'Europe' },
  { id: 'Europe/Rome', label: 'Italy (Rome)', region: 'Europe' },
  { id: 'Europe/Amsterdam', label: 'Netherlands (Amsterdam)', region: 'Europe' },
  { id: 'Europe/Istanbul', label: 'Türkiye (Istanbul)', region: 'Europe' },
  { id: 'Asia/Dubai', label: 'UAE (Dubai)', region: 'Asia & Pacific' },
  { id: 'Asia/Riyadh', label: 'Saudi Arabia (Riyadh)', region: 'Asia & Pacific' },
  { id: 'Asia/Kolkata', label: 'India (Kolkata)', region: 'Asia & Pacific' },
  { id: 'Asia/Karachi', label: 'Pakistan (Karachi)', region: 'Asia & Pacific' },
  { id: 'Asia/Dhaka', label: 'Bangladesh (Dhaka)', region: 'Asia & Pacific' },
  { id: 'Asia/Singapore', label: 'Singapore', region: 'Asia & Pacific' },
  { id: 'Asia/Manila', label: 'Philippines (Manila)', region: 'Asia & Pacific' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong', region: 'Asia & Pacific' },
  { id: 'Asia/Shanghai', label: 'China (Shanghai)', region: 'Asia & Pacific' },
  { id: 'Asia/Tokyo', label: 'Japan (Tokyo)', region: 'Asia & Pacific' },
  { id: 'Australia/Sydney', label: 'Australia (Sydney)', region: 'Asia & Pacific' },
  { id: 'Pacific/Auckland', label: 'New Zealand (Auckland)', region: 'Asia & Pacific' },
  { id: 'UTC', label: 'UTC', region: 'Other' },
];

export function isValidTimeZone(tz?: string | null): tz is string {
  if (!tz || typeof tz !== 'string') return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

export function safeTimeZone(tz?: string | null, fallback = DEFAULT_TIME_ZONE): string {
  return isValidTimeZone(tz) ? tz : fallback;
}

export function browserTimeZone(): string {
  try { return safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return DEFAULT_TIME_ZONE; }
}

export function timeZoneLabel(tz: string): string {
  return TIME_ZONE_OPTIONS.find((o) => o.id === tz)?.label || tz.replace(/_/g, ' ');
}

/** Short offset such as "GMT", "GMT-5" or "GMT+5:30" for the given zone at the given moment. */
export function offsetLabel(tz: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(at).find((p) => p.type === 'timeZoneName')?.value || tz;
  } catch { return tz; }
}

function partsIn(tz: string, at: Date) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(at)) if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
  return o;
}

/** The UTC instant at which the wall clock in `tz` reads ymd + hhmm (handles daylight saving). */
export function zonedToInstant(ymd: string, hhmm: string, tz: string): Date {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  const t = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  if (!d || !t) return new Date(NaN);
  const zone = safeTimeZone(tz);
  const wallAsUtc = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2], 0);
  let guess = wallAsUtc;
  for (let i = 0; i < 2; i += 1) {
    const p = partsIn(zone, new Date(guess));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
    guess += wallAsUtc - shown;
  }
  return new Date(guess);
}

export function ymdOf(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** When an appointment starts (UTC instant). appointmentDate is the doctor's calendar day. */
export function appointmentInstant(appt: { appointmentDate: string | Date; appointmentTime: string; doctorTimeZone?: string | null }): Date {
  return zonedToInstant(ymdOf(appt.appointmentDate), appt.appointmentTime, safeTimeZone(appt.doctorTimeZone));
}

export function formatTimeIn(at: Date, tz: string): string {
  if (Number.isNaN(at.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: safeTimeZone(tz), hour: 'numeric', minute: '2-digit' }).format(at);
}

export function formatDateIn(at: Date, tz: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }): string {
  if (Number.isNaN(at.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: safeTimeZone(tz), ...opts }).format(at);
}

export type ApptWhen = { date: string; time: string; zone: string; sameZone: boolean; doctorTime: string; doctorZone: string; ymd: string; instant: Date };

/** An appointment as seen from `viewerTz`: "Thu, Nov 27", "3:00 PM", "GMT-5" (+ the doctor's own clock time). */
export function appointmentWhen(
  appt: { appointmentDate: string | Date; appointmentTime: string; doctorTimeZone?: string | null },
  viewerTz: string,
): ApptWhen {
  const doctorZone = safeTimeZone(appt.doctorTimeZone);
  const viewer = safeTimeZone(viewerTz);
  const instant = appointmentInstant(appt);
  const valid = !Number.isNaN(instant.getTime());
  return {
    date: valid ? formatDateIn(instant, viewer) : String(appt.appointmentDate).slice(0, 10),
    time: valid ? formatTimeIn(instant, viewer) : appt.appointmentTime,
    zone: offsetLabel(viewer, valid ? instant : new Date()),
    sameZone: valid ? offsetLabel(viewer, instant) === offsetLabel(doctorZone, instant) : true,
    doctorTime: valid ? formatTimeIn(instant, doctorZone) : appt.appointmentTime,
    doctorZone,
    ymd: valid ? new Intl.DateTimeFormat('en-CA', { timeZone: viewer }).format(instant) : ymdOf(appt.appointmentDate),
    instant,
  };
}

/** One line for emails / WhatsApp: "Thu, Nov 27 at 3:00 PM (GMT-5)". */
export function appointmentSentence(
  appt: { appointmentDate: string | Date; appointmentTime: string; doctorTimeZone?: string | null },
  recipientTz?: string | null,
): string {
  const w = appointmentWhen(appt, safeTimeZone(recipientTz, safeTimeZone(appt.doctorTimeZone)));
  return `${w.date} at ${w.time} (${w.zone})`;
}
