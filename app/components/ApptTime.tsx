'use client';

import { appointmentWhen } from '@/lib/timezone';
import { useViewerTimeZone } from '@/lib/useTimeZone';

type Appt = { appointmentDate: string | Date; appointmentTime: string; doctorTimeZone?: string | null };

/** An appointment's time in the viewer's own time zone (adds the doctor's local time when the zones differ). */
export function ApptTime({ appt, part = 'time', showDoctorTime = true }: { appt: Appt; part?: 'time' | 'date' | 'datetime'; showDoctorTime?: boolean }) {
  const { timeZone } = useViewerTimeZone();
  const w = appointmentWhen(appt, timeZone);
  const text = part === 'date' ? w.date : part === 'datetime' ? `${w.date}, ${w.time} ${w.zone}` : `${w.time} ${w.zone}`;
  return (
    <span title={w.sameZone ? undefined : `Doctor's time: ${w.doctorTime}`}>
      {text}
      {!w.sameZone && showDoctorTime && part !== 'date' && (
        <span className="ml-1 text-[11px] font-normal text-gray-400">(doctor: {w.doctorTime})</span>
      )}
    </span>
  );
}

/** Day-of-month + short month for date badges, in the viewer's zone. */
export function ApptDayBadge({ appt }: { appt: Appt }) {
  const { timeZone } = useViewerTimeZone();
  const w = appointmentWhen(appt, timeZone);
  const [y, m, d] = w.ymd.split('-').map(Number);
  const month = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return (
    <>
      <span className="text-2xl font-bold text-teal-600">{d}</span>
      <span className="text-xs font-medium uppercase text-teal-700">{month}</span>
    </>
  );
}
