'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CalendarOff, Check, Clock, Copy, Globe, Pause, Play, Plus, Save, Trash2, X } from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useViewerTimeZone } from '@/lib/useTimeZone';
import { WEEK, summarizeWeek, type AvailabilitySettings, type DayPlan, type TimeRange, type Weekday } from '@/lib/availability';

const DAY_LABEL: Record<Weekday, string> = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
const PRESETS: { label: string; days: Weekday[]; ranges: TimeRange[] }[] = [
  { label: 'Mon–Fri 9–5', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], ranges: [{ start: '09:00', end: '17:00' }] },
  { label: 'Mon–Fri with lunch break', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], ranges: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '17:30' }] },
  { label: 'Evenings 5–9pm', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], ranges: [{ start: '17:00', end: '21:00' }] },
  { label: 'Every day 8–6', days: [...WEEK], ranges: [{ start: '08:00', end: '18:00' }] },
];
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
const input = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const ymdToday = () => new Date().toISOString().slice(0, 10);

function AvailabilityInner() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const role = session?.user?.role || '';
  const isPharmacy = role === 'pharmacy';
  const providerId = params.get('doctorId') || session?.user?.id || '';
  const { timeZone: viewerTz } = useViewerTimeZone();

  const [s, setS] = useState<AvailabilitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pauseChoice, setPauseChoice] = useState('indefinite');
  const [customUntil, setCustomUntil] = useState('');

  const word = isPharmacy ? { hours: 'Opening hours', off: 'Temporarily closed', on: 'Open for orders', away: 'Closures' } : { hours: 'Weekly hours', off: "I'm not available", on: 'Accepting bookings', away: 'Time off' };

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/doctors/${providerId}/schedule`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to load');
      setS(j.effective.settings);
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setLoading(false); }
  }, [providerId]);
  useEffect(() => { if (providerId) load(); }, [providerId, load]);

  const edit = (fn: (draft: AvailabilitySettings) => void) => {
    setS((cur) => { if (!cur) return cur; const d = structuredClone(cur); fn(d); return d; });
    setDirty(true); setMsg(null);
  };

  const save = async (override?: Partial<AvailabilitySettings>) => {
    if (!s) return;
    setSaving(true); setMsg(null);
    const body = { ...s, ...override };
    try {
      const r = await fetch(`/api/doctors/${providerId}/schedule`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to save');
      setS(j.effective.settings); setDirty(false);
      setMsg({ ok: true, text: 'Saved. Your changes are live.' });
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setSaving(false); }
  };

  const pauseUntilIso = (): string | null => {
    const now = Date.now();
    if (pauseChoice === '1d') return new Date(now + 864e5).toISOString();
    if (pauseChoice === '3d') return new Date(now + 3 * 864e5).toISOString();
    if (pauseChoice === '7d') return new Date(now + 7 * 864e5).toISOString();
    if (pauseChoice === 'custom' && customUntil) return new Date(`${customUntil}T23:59:59`).toISOString();
    return null;
  };

  const activelyPaused = !!s?.paused && (!s.pausedUntil || new Date(s.pausedUntil).getTime() > Date.now());
  const summary = useMemo(() => (s ? summarizeWeek(s.weekly) : ''), [s]);

  if (loading || !s) {
    return <div className="mx-auto max-w-4xl space-y-4 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}{msg && <p className="text-sm text-red-600">{msg.text}</p>}</div>;
  }

  const setDay = (d: Weekday, fn: (p: DayPlan) => void) => edit((x) => { fn(x.weekly[d]); });

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isPharmacy ? 'Opening hours & availability' : 'My availability'}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isPharmacy ? 'Tell patients when you are open and pause orders when you need a break.' : 'Set when patients can book you. Changes apply to new bookings straight away.'}
        </p>
      </div>

      {/* Status */}
      <section className={`${card} ${activelyPaused ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${activelyPaused ? 'bg-amber-500' : 'bg-emerald-500'} text-white`}>{activelyPaused ? <Pause className="h-5 w-5" /> : <Check className="h-5 w-5" />}</span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{activelyPaused ? (isPharmacy ? 'Temporarily closed' : 'Not available right now') : word.on}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {activelyPaused ? (s.pausedUntil ? `Back on ${new Date(s.pausedUntil).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}` : 'Until you turn it back on') : summary}
              </p>
            </div>
          </div>
          {activelyPaused && (
            <button onClick={() => save({ paused: false, pausedUntil: null })} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Play className="h-4 w-4" />Turn back on</button>
          )}
        </div>
        {!activelyPaused && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{word.off} — pause new {isPharmacy ? 'orders' : 'bookings'}</p>
            <div className="flex flex-wrap items-center gap-2">
              <select value={pauseChoice} onChange={(e) => setPauseChoice(e.target.value)} className={input}>
                <option value="indefinite">Until I turn it back on</option>
                <option value="1d">For 1 day</option><option value="3d">For 3 days</option><option value="7d">For 1 week</option>
                <option value="custom">Until a date…</option>
              </select>
              {pauseChoice === 'custom' && <input type="date" min={ymdToday()} value={customUntil} onChange={(e) => setCustomUntil(e.target.value)} className={input} />}
              <input placeholder="Message patients will see (optional)" value={s.pauseMessage} onChange={(e) => edit((x) => { x.pauseMessage = e.target.value; })} className={`${input} min-w-[14rem] flex-1`} maxLength={200} />
              <button disabled={saving || (pauseChoice === 'custom' && !customUntil)} onClick={() => save({ paused: true, pausedUntil: pauseUntilIso() })} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"><Pause className="h-4 w-4" />Pause</button>
            </div>
          </div>
        )}
      </section>

      {/* Weekly */}
      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><Clock className="h-5 w-5 text-teal-600" />{word.hours}</h2>
          <select defaultValue="" onChange={(e) => { const p = PRESETS[+e.target.value]; if (!p) return; edit((x) => { WEEK.forEach((d) => { x.weekly[d] = p.days.includes(d) ? { enabled: true, ranges: structuredClone(p.ranges) } : { enabled: false, ranges: [] }; }); }); e.target.value = ''; }} className={input}>
            <option value="" disabled>Quick presets…</option>
            {PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
          </select>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {WEEK.map((d) => {
            const p = s.weekly[d];
            return (
              <li key={d} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                <label className="flex w-40 shrink-0 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={p.enabled} onChange={(e) => setDay(d, (q) => { q.enabled = e.target.checked; if (e.target.checked && !q.ranges.length) q.ranges = [{ start: '09:00', end: '17:00' }]; })} className="h-4 w-4 accent-teal-600" />
                  <span className={`text-sm font-medium ${p.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{DAY_LABEL[d]}</span>
                </label>
                <div className="flex-1 space-y-2">
                  {!p.enabled && <p className="text-sm text-slate-400">{isPharmacy ? 'Closed' : 'Not available'}</p>}
                  {p.enabled && p.ranges.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <input type="time" value={r.start} onChange={(e) => setDay(d, (q) => { q.ranges[i].start = e.target.value; })} className={input} />
                      <span className="text-slate-400">to</span>
                      <input type="time" value={r.end} onChange={(e) => setDay(d, (q) => { q.ranges[i].end = e.target.value; })} className={input} />
                      {r.end <= r.start && <span className="text-xs text-red-600">End must be after start</span>}
                      <button aria-label="Remove hours" onClick={() => setDay(d, (q) => { q.ranges.splice(i, 1); if (!q.ranges.length) q.enabled = false; })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {p.enabled && (
                    <div className="flex gap-3 text-xs font-medium">
                      <button onClick={() => setDay(d, (q) => { const last = q.ranges[q.ranges.length - 1]; const st = last ? last.end : '09:00'; q.ranges.push({ start: st, end: st < '20:00' ? `${String(+st.slice(0, 2) + 2).padStart(2, '0')}:${st.slice(3)}` : '23:59' }); })} className="inline-flex items-center gap-1 text-teal-700 hover:underline dark:text-teal-400"><Plus className="h-3.5 w-3.5" />Add hours (e.g. after a break)</button>
                      <button onClick={() => edit((x) => { WEEK.forEach((o) => { if (o !== d) x.weekly[o] = { enabled: true, ranges: structuredClone(p.ranges) }; }); })} className="inline-flex items-center gap-1 text-slate-500 hover:underline"><Copy className="h-3.5 w-3.5" />Copy to all days</button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Globe className="h-3.5 w-3.5" />Times are in your time zone ({viewerTz}). Change it from the clock at the top of the page; patients elsewhere see these converted.</p>
      </section>

      {/* Settings */}
      {!isPharmacy && (
        <section className={card}>
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Booking rules</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['Appointment length', 'slotDurationMinutes', [15, 20, 30, 45, 60, 90], (v: number) => `${v} min`],
              ['Break between visits', 'bufferMinutes', [0, 5, 10, 15, 30], (v: number) => (v ? `${v} min` : 'None')],
              ['Minimum notice', 'minNoticeHours', [0, 1, 2, 4, 12, 24, 48], (v: number) => (v ? `${v} hour${v > 1 ? 's' : ''}` : 'None')],
              ['Book up to', 'maxAdvanceDays', [7, 14, 30, 60, 90, 180], (v: number) => `${v} days ahead`],
              ['Max visits per day', 'maxPerDay', [0, 4, 6, 8, 10, 15, 20], (v: number) => (v ? `${v}` : 'No limit')],
            ] as const).map(([label, key, opts, fmt]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
                <select value={s[key] as number} onChange={(e) => edit((x) => { (x[key] as number) = +e.target.value; })} className={`${input} w-full`}>
                  {Array.from(new Set([...opts, s[key] as number])).sort((a, b) => a - b).map((o) => <option key={o} value={o}>{fmt(o)}</option>)}
                </select>
              </label>
            ))}
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={s.websiteBookingEnabled} onChange={(e) => edit((x) => { x.websiteBookingEnabled = e.target.checked; })} className="h-4 w-4 accent-teal-600" />
              <span className="text-slate-700 dark:text-slate-200">Allow booking from the public website</span>
            </label>
          </div>
        </section>
      )}

      {/* Time off */}
      <section className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><CalendarOff className="h-5 w-5 text-teal-600" />{word.away}</h2>
          <button onClick={() => edit((x) => { x.timeOff.push({ from: ymdToday(), to: ymdToday(), reason: '' }); })} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"><Plus className="h-4 w-4" />Add</button>
        </div>
        {!s.timeOff.length && <p className="text-sm text-slate-500">Holidays, leave or conferences. No bookings are possible on these dates.</p>}
        <ul className="space-y-2">
          {s.timeOff.map((t, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <input type="date" value={t.from} onChange={(e) => edit((x) => { x.timeOff[i].from = e.target.value; if (x.timeOff[i].to < e.target.value) x.timeOff[i].to = e.target.value; })} className={input} />
              <span className="text-slate-400">to</span>
              <input type="date" min={t.from} value={t.to} onChange={(e) => edit((x) => { x.timeOff[i].to = e.target.value; })} className={input} />
              <input placeholder="Reason (optional)" value={t.reason || ''} onChange={(e) => edit((x) => { x.timeOff[i].reason = e.target.value; })} className={`${input} min-w-[10rem] flex-1`} maxLength={120} />
              <button aria-label="Remove" onClick={() => edit((x) => { x.timeOff.splice(i, 1); })} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </section>

      {/* Special dates */}
      <section className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Special dates</h2>
          <button onClick={() => edit((x) => { x.dateOverrides.push({ date: ymdToday(), available: true, ranges: [{ start: '09:00', end: '13:00' }], note: '' }); })} className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"><Plus className="h-4 w-4" />Add</button>
        </div>
        {!s.dateOverrides.length && <p className="text-sm text-slate-500">Different hours for one day (a half day, an extra Saturday), or switch a single day off.</p>}
        <ul className="space-y-3">
          {s.dateOverrides.map((o, i) => (
            <li key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={o.date} onChange={(e) => edit((x) => { x.dateOverrides[i].date = e.target.value; })} className={input} />
                <select value={o.available ? 'hours' : 'off'} onChange={(e) => edit((x) => { x.dateOverrides[i].available = e.target.value === 'hours'; if (e.target.value === 'hours' && !x.dateOverrides[i].ranges.length) x.dateOverrides[i].ranges = [{ start: '09:00', end: '13:00' }]; })} className={input}>
                  <option value="hours">Custom hours</option><option value="off">Not available</option>
                </select>
                <input placeholder="Note (optional)" value={o.note || ''} onChange={(e) => edit((x) => { x.dateOverrides[i].note = e.target.value; })} className={`${input} min-w-[8rem] flex-1`} maxLength={120} />
                <button aria-label="Remove" onClick={() => edit((x) => { x.dateOverrides.splice(i, 1); })} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              {o.available && (
                <div className="mt-2 space-y-2">
                  {o.ranges.map((r, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <input type="time" value={r.start} onChange={(e) => edit((x) => { x.dateOverrides[i].ranges[k].start = e.target.value; })} className={input} />
                      <span className="text-slate-400">to</span>
                      <input type="time" value={r.end} onChange={(e) => edit((x) => { x.dateOverrides[i].ranges[k].end = e.target.value; })} className={input} />
                      <button aria-label="Remove hours" onClick={() => edit((x) => { x.dateOverrides[i].ranges.splice(k, 1); })} className="p-1 text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => edit((x) => { x.dateOverrides[i].ranges.push({ start: '14:00', end: '17:00' }); })} className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"><Plus className="h-3.5 w-3.5" />Add hours</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {!isPharmacy && <p className="text-center text-sm text-slate-500">See what patients see on <Link href="/appointments/slots" className="font-medium text-teal-700 underline dark:text-teal-400">your slots page</Link>.</p>}

      {/* Sticky save */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 p-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 lg:left-64">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className={`text-sm ${msg ? (msg.ok ? 'text-emerald-600' : 'text-red-600') : 'text-slate-500'}`}>{msg ? msg.text : dirty ? 'You have unsaved changes' : 'All changes saved'}</p>
          <button onClick={() => save()} disabled={saving || !dirty} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <ProtectedRoute>
      <SidebarLayout title="Availability">
        <AvailabilityInner />
      </SidebarLayout>
    </ProtectedRoute>
  );
}
