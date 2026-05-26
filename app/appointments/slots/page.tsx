'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Calendar, LayoutGrid, ArrowLeft, Search, ChevronDown, X } from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';

type DoctorRow = { _id: string; name: string; email?: string };
type SlotRow = { time: string; available: boolean };

export default function AppointmentSlotsPage() {
  const { t } = useTranslations();
  const { data: session, status } = useSession();
  const [doctorId, setDoctorId] = useState('');
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorResults, setDoctorResults] = useState<DoctorRow[]>([]);
  const [doctorMenuOpen, setDoctorMenuOpen] = useState(false);
  const [doctorSearchLoading, setDoctorSearchLoading] = useState(false);
  const [highlightedDoctorIndex, setHighlightedDoctorIndex] = useState(-1);
  const doctorPickerRef = useRef<HTMLDivElement>(null);
  const doctorInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [loading, setLoading] = useState(false);

  const isDoctor = session?.user?.role === 'doctor';
  const selfId = session?.user?.id || '';

  const searchDoctors = useCallback(async (q: string) => {
    setDoctorSearchLoading(true);
    try {
      const res = await fetch(`/api/doctors?q=${encodeURIComponent(q)}&limit=30`);
      if (!res.ok) {
        setDoctorResults([]);
        return;
      }
      const data = await res.json();
      setDoctorResults(Array.isArray(data) ? data : []);
    } catch {
      setDoctorResults([]);
    } finally {
      setDoctorSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDoctor && selfId) {
      setDoctorId(selfId);
      setDoctorQuery(session?.user?.name || '');
    }
  }, [isDoctor, selfId, session?.user?.name]);

  useEffect(() => {
    if (isDoctor) return;

    const timeout = setTimeout(() => {
      if (doctorMenuOpen) {
        searchDoctors(doctorQuery);
      }
    }, 280);

    return () => clearTimeout(timeout);
  }, [doctorQuery, doctorMenuOpen, isDoctor, searchDoctors]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (doctorPickerRef.current && !doctorPickerRef.current.contains(e.target as Node)) {
        setDoctorMenuOpen(false);
        setHighlightedDoctorIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    const q = new URLSearchParams({ doctorId, date });
    fetch(`/api/appointments/slots?${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.slots) setSlots(data.slots);
        else setSlots([]);
        if (typeof data.slotDurationMinutes === 'number') {
          setSlotDurationMinutes(data.slotDurationMinutes);
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [doctorId, date]);

  const pickDoctor = (d: DoctorRow) => {
    setDoctorId(d._id);
    setDoctorQuery(d.name);
    setDoctorMenuOpen(false);
    setHighlightedDoctorIndex(-1);
  };

  const clearDoctor = () => {
    setDoctorId('');
    setDoctorQuery('');
    setDoctorResults([]);
    setHighlightedDoctorIndex(-1);
    doctorInputRef.current?.focus();
  };

  const onDoctorInputChange = (v: string) => {
    if (isDoctor) return;
    setDoctorQuery(v);
    setDoctorId('');
    setDoctorMenuOpen(true);
    setHighlightedDoctorIndex(-1);
  };

  const onDoctorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isDoctor) return;
    if (!doctorMenuOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setDoctorMenuOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedDoctorIndex((i) =>
        i < doctorResults.length - 1 ? i + 1 : i
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedDoctorIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick =
        highlightedDoctorIndex >= 0 ? doctorResults[highlightedDoctorIndex] : doctorResults[0];
      if (pick) pickDoctor(pick);
    } else if (e.key === 'Escape') {
      setDoctorMenuOpen(false);
      setHighlightedDoctorIndex(-1);
    }
  };

  if (status === 'loading') {
    return (
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('appointments.slotAvailability')}
        description={t('appointments.description')}
        dense
      >
        <div className="mx-auto max-w-4xl space-y-3">
          <Link
            href="/appointments"
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            {t('appointments.title')}
          </Link>

          <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
                  {t('appointments.slotAvailability')}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                  {t('appointments.slotsLegendAvailable')} / {t('appointments.slotsLegendBooked')} —{' '}
                  {slotDurationMinutes} min slots
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div ref={doctorPickerRef}>
                <label
                  htmlFor="slots-doctor-search"
                  className="mb-1 block text-[11px] font-medium text-gray-600 sm:text-xs"
                >
                  {t('appointments.doctorName')}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={doctorInputRef}
                    id="slots-doctor-search"
                    type="search"
                    autoComplete="off"
                    placeholder={t('appointments.placeholders.selectDoctor')}
                    className="h-8 w-full rounded-md border border-gray-300 py-1 pl-8 pr-16 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-700"
                    value={doctorQuery}
                    disabled={isDoctor}
                    onChange={(e) => onDoctorInputChange(e.target.value)}
                    onFocus={() => {
                      if (!isDoctor) {
                        setDoctorMenuOpen(true);
                      }
                    }}
                    onKeyDown={onDoctorKeyDown}
                  />
                  {!isDoctor && doctorId && (
                    <button
                      type="button"
                      className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      onClick={clearDoctor}
                      aria-label="Clear doctor"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!isDoctor && (
                    <button
                      type="button"
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      onClick={() => {
                        setDoctorMenuOpen((o) => !o);
                        doctorInputRef.current?.focus();
                      }}
                      aria-expanded={doctorMenuOpen}
                      aria-label="Toggle doctor results"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${doctorMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                  {doctorMenuOpen && !isDoctor && (
                    <div className="absolute z-40 mt-0.5 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white text-xs shadow-md">
                      {doctorSearchLoading ? (
                        <div className="flex items-center justify-center gap-2 px-2 py-3 text-gray-500">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                          <span>…</span>
                        </div>
                      ) : doctorResults.length === 0 ? (
                        <div className="px-2 py-2 text-center text-[11px] text-gray-500">
                          {t('calendar.noDoctorMatch') || 'No doctors found'}
                        </div>
                      ) : (
                        doctorResults.map((d, index) => (
                          <button
                            key={d._id}
                            type="button"
                            role="option"
                            aria-selected={doctorId === d._id || index === highlightedDoctorIndex}
                            className={`flex w-full flex-col border-b border-gray-50 px-2 py-1.5 text-left last:border-b-0 hover:bg-blue-50 ${
                              index === highlightedDoctorIndex || doctorId === d._id
                                ? 'bg-blue-50 text-blue-900'
                                : 'text-gray-900'
                            }`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickDoctor(d)}
                          >
                            <span className="font-medium">{d.name}</span>
                            {d.email ? (
                              <span className="truncate text-[11px] text-gray-500">{d.email}</span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-600 sm:text-xs">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {t('appointments.appointmentDate')}
                </label>
                <input
                  type="date"
                  className="h-8 w-full rounded-md border border-gray-300 px-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {!doctorId ? (
              <p className="text-xs text-gray-500 sm:text-sm">{t('appointments.placeholders.selectDoctor')}</p>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-xs text-gray-500 sm:text-sm">{t('publicAppointment.noSlots')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-8 sm:gap-2">
                {slots.map((s) => (
                  <div
                    key={s.time}
                    className={`rounded-md border px-1.5 py-1.5 text-center text-xs font-medium sm:px-2 sm:py-2 sm:text-sm ${
                      s.available
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-gray-200 bg-gray-100 text-gray-500 line-through'
                    }`}
                  >
                    {s.time}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-2 text-[11px] text-gray-600 sm:text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200 sm:h-3 sm:w-3" />
                {t('appointments.slotsLegendAvailable')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-gray-200 sm:h-3 sm:w-3" />
                {t('appointments.slotsLegendBooked')}
              </span>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
