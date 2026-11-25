'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Clock, Search } from 'lucide-react';
import { TIME_ZONE_OPTIONS, offsetLabel, timeZoneLabel } from '@/lib/timezone';
import { useViewerTimeZone } from '@/lib/useTimeZone';

/** Pick your country / time zone. Every appointment time on the site is shown in this zone. */
export default function TimeZoneSelect({ compact = false }: { compact?: boolean }) {
  const { timeZone, setTimeZone } = useViewerTimeZone();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const needle = q.trim().toLowerCase();
  const options = TIME_ZONE_OPTIONS.filter((o) => !needle || `${o.label} ${o.id}`.toLowerCase().includes(needle));
  const regions = Array.from(new Set(options.map((o) => o.region)));
  const known = TIME_ZONE_OPTIONS.some((o) => o.id === timeZone);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} title="Your time zone"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
        <Clock className="h-4 w-4 text-violet-600" />
        <span className={compact ? 'hidden md:inline' : ''}>{offsetLabel(timeZone)}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-[90] mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 p-3">
            <p className="text-sm font-semibold text-gray-900">Your time zone</p>
            <p className="text-xs text-gray-500">Appointment times show in {timeZoneLabel(timeZone)} time.</p>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country or city"
                className="h-9 w-full rounded-md border border-gray-200 pl-8 pr-2 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {!known && !needle && (
              <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm bg-violet-50" onClick={() => setOpen(false)}>
                <span>{timeZoneLabel(timeZone)}</span><Check className="h-4 w-4 text-violet-600" />
              </button>
            )}
            {regions.map((r) => (
              <div key={r}>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{r}</p>
                {options.filter((o) => o.region === r).map((o) => (
                  <button key={o.id} type="button" onClick={() => { setTimeZone(o.id); setOpen(false); }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${o.id === timeZone ? 'bg-violet-50' : ''}`}>
                    <span className="truncate">{o.label}</span>
                    <span className="ml-2 shrink-0 text-xs text-gray-400">{o.id === timeZone ? <Check className="h-4 w-4 text-violet-600" /> : offsetLabel(o.id)}</span>
                  </button>
                ))}
              </div>
            ))}
            {options.length === 0 && <p className="px-3 py-4 text-sm text-gray-500">No match.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
