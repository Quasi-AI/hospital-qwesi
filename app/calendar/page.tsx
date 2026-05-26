'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Plus,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import SearchablePatientSelect from '../components/SearchablePatientSelect';
import { useTranslations } from '../hooks/useTranslations';

interface QuickAddPatient {
  _id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
}

interface Appointment {
  _id: string;
  patientName: string;
  patientId?: string;
  doctorName: string;
  /** Populated by GET /api/appointments from User.specialization when doctorId/email matches */
  doctorSpecialization?: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status: string;
  location: string;
}

function formatAgendaPatientLine(apt: Appointment): string {
  const pid =
    apt.patientId != null && String(apt.patientId).trim() !== ''
      ? String(apt.patientId).trim()
      : '';
  const name = apt.patientName?.trim() || '';
  if (pid && name) return `${pid} · ${name}`;
  if (pid) return pid;
  return name;
}

function formatAgendaDoctorLine(apt: Appointment): string {
  const spec = apt.doctorSpecialization?.trim();
  const name = apt.doctorName?.trim() || '';
  if (spec && name) return `${spec} · ${name}`;
  return name;
}

/** Match appointment times to slot grid (same rules as lib/appointmentSlotting). */
function normalizeAgendaTime(t: string): string {
  const m = String(t || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}


export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <CalendarPageContent />
    </Suspense>
  );
}

interface DoctorOption {
  _id: string;
  name: string;
}

function aptDateKey(apt: Appointment): string {
  return new Date(apt.appointmentDate).toISOString().split('T')[0];
}

/** YYYY-MM-DD in local calendar, matching month-grid filtering */
function dateKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CalendarPageContent() {
  const { t, currentLanguage } = useTranslations();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const doctorIdFilter = searchParams.get('doctorId');
  const doctorIdValid =
    !!doctorIdFilter && /^[a-f0-9]{24}$/i.test(doctorIdFilter.trim());

  const canFilterByDoctor =
    session?.user?.role === 'admin' || session?.user?.role === 'staff';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [doctorComboInput, setDoctorComboInput] = useState('');
  const [doctorComboOpen, setDoctorComboOpen] = useState(false);
  const doctorComboRef = useRef<HTMLDivElement>(null);
  const [agendaDaySlots, setAgendaDaySlots] = useState<{ time: string; available: boolean }[] | null>(
    null
  );
  const [agendaSlotsLoading, setAgendaSlotsLoading] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSlotTime, setQuickAddSlotTime] = useState<string | null>(null);
  const [quickAddPatient, setQuickAddPatient] = useState<QuickAddPatient | null>(null);
  const [quickAddReason, setQuickAddReason] = useState('');
  const [quickAddDoctorEmail, setQuickAddDoctorEmail] = useState<string | undefined>();
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  const locale =
    currentLanguage === 'es'
      ? 'es-ES'
      : currentLanguage === 'fr'
        ? 'fr-FR'
        : currentLanguage === 'ar'
          ? 'ar-SA'
          : 'en-US';

  // Localized day and month names
  const getLocalizedDays = () => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(2024, 0, i + 1);
      days.push(date.toLocaleDateString(locale, { weekday: 'short' }));
    }
    return days;
  };

  const getLocalizedDate = (date: Date) => {
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    return currentDate.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [viewMode, currentDate, locale]);

  const agendaAppointments = useMemo(() => {
    const dayKey = dateKeyLocal(currentDate);
    return appointments
      .filter((apt) => aptDateKey(apt) === dayKey)
      .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
  }, [appointments, currentDate]);

  const agendaAppointmentsByTime = useMemo(() => {
    const m = new Map<string, Appointment>();
    for (const apt of agendaAppointments) {
      const key = normalizeAgendaTime(apt.appointmentTime || '');
      if (key && !m.has(key)) m.set(key, apt);
    }
    return m;
  }, [agendaAppointments]);

  const agendaOrphanAppointments = useMemo(() => {
    if (!agendaDaySlots || agendaDaySlots.length === 0) return [];
    return agendaAppointments.filter((apt) => {
      const key = normalizeAgendaTime(apt.appointmentTime || '');
      if (!key) return true;
      const slot = agendaDaySlots.find((s) => s.time === key);
      if (!slot) return true;
      if (slot.available) return true;
      return false;
    });
  }, [agendaAppointments, agendaDaySlots]);

  const scopedForStats = useMemo(() => {
    const cy = currentDate.getFullYear();
    const cm = currentDate.getMonth();
    if (viewMode === 'month') {
      return appointments.filter((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate.getMonth() === cm && aptDate.getFullYear() === cy;
      });
    }
    const dayKey = dateKeyLocal(currentDate);
    return appointments.filter((apt) => aptDateKey(apt) === dayKey);
  }, [appointments, viewMode, currentDate]);

  const filteredDoctorOptions = useMemo(() => {
    const q = doctorComboInput.trim().toLowerCase();
    if (!q) return doctorsList;
    return doctorsList.filter((d) => d.name.toLowerCase().includes(q));
  }, [doctorsList, doctorComboInput]);

  useEffect(() => {
    if (doctorComboOpen) return;
    if (!doctorIdValid || !doctorIdFilter) {
      setDoctorComboInput('');
      return;
    }
    const found = doctorsList.find((d) => d._id === doctorIdFilter.trim());
    if (found) setDoctorComboInput(found.name);
  }, [doctorIdValid, doctorIdFilter, doctorsList, doctorComboOpen]);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const url = doctorIdValid
          ? `/api/appointments?doctorId=${encodeURIComponent(doctorIdFilter!.trim())}`
          : '/api/appointments';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAppointments(data);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [doctorIdFilter, doctorIdValid]);

  useEffect(() => {
    if (!canFilterByDoctor) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/doctors');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        const mapped: DoctorOption[] = data
          .map((d: { _id?: string; name?: string }) => ({
            _id: String(d._id ?? ''),
            name: d.name ?? '',
          }))
          .filter((d) => /^[a-f0-9]{24}$/i.test(d._id));
        mapped.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        setDoctorsList(mapped);
      } catch {
        if (!cancelled) setDoctorsList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canFilterByDoctor]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (doctorComboRef.current && !doctorComboRef.current.contains(e.target as Node)) {
        setDoctorComboOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (viewMode !== 'agenda' || !doctorIdValid || !doctorIdFilter) {
      setAgendaDaySlots(null);
      return;
    }
    const dateStr = dateKeyLocal(currentDate);
    let cancelled = false;
    setAgendaSlotsLoading(true);
    setAgendaDaySlots(null);
    fetch(
      `/api/appointments/slots?doctorId=${encodeURIComponent(doctorIdFilter.trim())}&date=${encodeURIComponent(dateStr)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAgendaDaySlots(Array.isArray(data.slots) ? data.slots : []);
      })
      .catch(() => {
        if (!cancelled) setAgendaDaySlots([]);
      })
      .finally(() => {
        if (!cancelled) setAgendaSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, doctorIdValid, doctorIdFilter, currentDate]);

  const setDoctorFilter = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!id) {
      params.delete('doctorId');
      setDoctorComboInput('');
    } else {
      params.set('doctorId', id);
      const d = doctorsList.find((x) => x._id === id);
      setDoctorComboInput(d?.name ?? '');
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
    setDoctorComboOpen(false);
  };

  const refetchAppointments = async () => {
    try {
      const url = doctorIdValid
        ? `/api/appointments?doctorId=${encodeURIComponent(doctorIdFilter!.trim())}`
        : '/api/appointments';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch {
      /* ignore */
    }
  };

  /** Re-sync slot availability after booking (otherwise slots stay “available” until full page reload). */
  const refetchAgendaSlots = async () => {
    if (viewMode !== 'agenda' || !doctorIdValid || !doctorIdFilter) return;
    const dateStr = dateKeyLocal(currentDate);
    try {
      const r = await fetch(
        `/api/appointments/slots?doctorId=${encodeURIComponent(doctorIdFilter.trim())}&date=${encodeURIComponent(dateStr)}`
      );
      if (!r.ok) return;
      const data = await r.json();
      if (Array.isArray(data.slots)) setAgendaDaySlots(data.slots);
    } catch {
      /* ignore */
    }
  };

  const closeQuickAdd = () => {
    setQuickAddOpen(false);
    setQuickAddSlotTime(null);
    setQuickAddPatient(null);
    setQuickAddReason('');
    setQuickAddError(null);
    setQuickAddDoctorEmail(undefined);
  };

  const openQuickAdd = (slotTime: string) => {
    setQuickAddSlotTime(slotTime);
    setQuickAddPatient(null);
    setQuickAddReason('');
    setQuickAddError(null);
    setQuickAddOpen(true);
    setQuickAddDoctorEmail(undefined);
    if (doctorIdFilter && /^[a-f0-9]{24}$/i.test(doctorIdFilter.trim())) {
      fetch(`/api/doctors?id=${encodeURIComponent(doctorIdFilter.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.email) setQuickAddDoctorEmail(String(d.email));
        })
        .catch(() => {});
    }
  };

  const submitQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorIdFilter || !quickAddSlotTime) return;
    if (!quickAddPatient?._id) {
      setQuickAddError(t('calendar.quickAddPatientRequired'));
      return;
    }
    if (!quickAddReason.trim()) {
      setQuickAddError(t('appointments.validation.reasonRequired'));
      return;
    }
    const doctorName =
      doctorsList.find((d) => d._id === doctorIdFilter.trim())?.name?.trim() || '';
    if (!doctorName) {
      setQuickAddError(t('appointments.validation.doctorNameRequired'));
      return;
    }
    setQuickAddSubmitting(true);
    setQuickAddError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: quickAddPatient.patientId?.trim() || undefined,
          patientName: quickAddPatient.name,
          patientEmail: quickAddPatient.email,
          patientPhone: quickAddPatient.phone,
          doctorId: doctorIdFilter.trim(),
          doctorName,
          doctorEmail: quickAddDoctorEmail,
          appointmentDate: dateKeyLocal(currentDate),
          appointmentTime: quickAddSlotTime,
          appointmentType: 'consultation',
          status: 'pending',
          location: '',
          reason: quickAddReason.trim(),
          notes: '',
          includeVideoCall: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setQuickAddError(
          typeof err.error === 'string' ? err.error : t('common.error')
        );
        return;
      }
      closeQuickAdd();
      await Promise.all([refetchAppointments(), refetchAgendaSlots()]);
    } catch {
      setQuickAddError(t('common.error'));
    } finally {
      setQuickAddSubmitting(false);
    }
  };

  useEffect(() => {
    if (!quickAddOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') closeQuickAdd();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [quickAddOpen]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay, year, month };
  };

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);

  const goPrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const goNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    setViewMode('agenda');
  };

  const getAppointmentsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      return aptDate === dateStr;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  const getStatusColor = (status: string | null | undefined) => {
    const s = (status ?? '').toString().toLowerCase();
    switch (s) {
      case 'confirmed':
        return 'bg-emerald-500';
      case 'pending':
        return 'bg-amber-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBgColor = (status: string | null | undefined) => {
    const s = (status ?? '').toString().toLowerCase();
    switch (s) {
      case 'confirmed':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'pending':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'cancelled':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const selectedDateAppointments = selectedDate
    ? getAppointmentsForDate(selectedDate.getDate())
    : [];

  // Generate calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const DAYS_OF_WEEK = getLocalizedDays();

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('calendar.title')} description={t('calendar.description')} dense>
        <div className="flex flex-col gap-3 lg:flex-row">
          {/* Calendar Section */}
          <div className="flex-1">
            {/* Calendar Header */}
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 sm:gap-x-2 lg:flex-nowrap lg:gap-2">
                  <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5">
                    <button
                      onClick={goPrev}
                      className="shrink-0 rounded-md bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
                      type="button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h2 className="min-w-0 max-w-[38vw] truncate text-center text-xs font-bold text-white sm:max-w-none sm:text-sm md:text-base">
                      {headerTitle}
                    </h2>
                    <button
                      onClick={goNext}
                      className="shrink-0 rounded-md bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
                      type="button"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {canFilterByDoctor && (
                    <div
                      ref={doctorComboRef}
                      className="relative min-w-0 flex-1 basis-[min(100%,18rem)] sm:min-w-[12rem] sm:max-w-[20rem]"
                    >
                        <label htmlFor="calendar-doctor-combo" className="sr-only">
                          {t('calendar.doctorFilter')}
                        </label>
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                            aria-hidden
                          />
                          <input
                            id="calendar-doctor-combo"
                            type="text"
                            role="combobox"
                            aria-expanded={doctorComboOpen}
                            aria-controls="calendar-doctor-listbox"
                            aria-autocomplete="list"
                            value={doctorComboInput}
                            onChange={(e) => {
                              setDoctorComboInput(e.target.value);
                              setDoctorComboOpen(true);
                            }}
                            onFocus={() => setDoctorComboOpen(true)}
                            onBlur={() => {
                              window.setTimeout(() => {
                                if (
                                  doctorComboRef.current &&
                                  !doctorComboRef.current.contains(document.activeElement)
                                ) {
                                  setDoctorComboOpen(false);
                                  if (!doctorComboInput.trim() && doctorIdValid) {
                                    setDoctorFilter(null);
                                  }
                                }
                              }, 150);
                            }}
                            placeholder={t('calendar.searchDoctors')}
                            className="w-full rounded-md border border-white/30 bg-white/95 py-1.5 pl-7 pr-8 text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/80"
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setDoctorComboOpen((o) => !o)}
                            aria-label={t('calendar.doctorFilter')}
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${doctorComboOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>
                        {doctorComboOpen && (
                          <ul
                            id="calendar-doctor-listbox"
                            role="listbox"
                            className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-52 overflow-auto rounded-md border border-gray-200 bg-white py-0.5 shadow-lg"
                          >
                            <li role="presentation">
                              <button
                                type="button"
                                role="option"
                                className="w-full px-2.5 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setDoctorFilter(null);
                                }}
                              >
                                {t('calendar.allDoctors')}
                              </button>
                            </li>
                            {filteredDoctorOptions.map((d) => (
                              <li key={d._id} role="presentation">
                                <button
                                  type="button"
                                  role="option"
                                  className={`w-full px-2.5 py-1.5 text-left text-xs hover:bg-blue-50 ${
                                    doctorIdValid && doctorIdFilter?.trim() === d._id
                                      ? 'bg-blue-50 font-medium text-blue-900'
                                      : 'text-gray-900'
                                  }`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setDoctorFilter(d._id);
                                  }}
                                >
                                  {d.name}
                                </button>
                              </li>
                            ))}
                            {filteredDoctorOptions.length === 0 && doctorComboInput.trim() && (
                              <li className="px-2 py-1.5 text-xs text-gray-500">
                                {t('calendar.noDoctorMatch')}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    )}

                  <button
                    onClick={goToToday}
                    type="button"
                    className="shrink-0 rounded-md bg-white/20 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/30 sm:px-3 sm:text-sm"
                  >
                    {t('calendar.today')}
                  </button>

                  <div
                    className="flex shrink-0 items-center rounded-md bg-white/10 p-0.5"
                    role="group"
                    aria-label={t('calendar.title')}
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode('month')}
                      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors sm:gap-1 sm:px-2 sm:py-1.5 sm:text-xs ${
                        viewMode === 'month'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{t('calendar.monthView')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('agenda')}
                      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors sm:gap-1 sm:px-2 sm:py-1.5 sm:text-xs ${
                        viewMode === 'agenda'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{t('calendar.agendaView')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex h-64 items-center justify-center sm:h-80">
                  <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600 sm:h-8 sm:w-8" />
                </div>
              ) : (
                <>
                  {viewMode === 'month' && (
                    <>
                      <div className="grid grid-cols-7 border-b border-gray-100">
                        {DAYS_OF_WEEK.map((day) => (
                          <div
                            key={day}
                            className="bg-gray-50 py-1.5 text-center text-[10px] font-semibold text-gray-600 sm:py-2 sm:text-xs"
                          >
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7">
                        {calendarDays.map((day, index) => {
                          const dayAppointments = day ? getAppointmentsForDate(day) : [];
                          const hasAppointments = dayAppointments.length > 0;

                          return (
                            <div
                              key={index}
                              className={`
                          min-h-[72px] cursor-pointer border-b border-r border-gray-100 p-1 transition-colors sm:min-h-[92px] sm:p-1.5
                          ${day ? 'hover:bg-blue-50' : 'bg-gray-50'}
                          ${isToday(day || 0) ? 'bg-blue-50' : ''}
                          ${isSelected(day || 0) ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : ''}
                        `}
                              onClick={() => day && handleDateClick(day)}
                            >
                              {day && (
                                <>
                                  <div className="mb-0.5 flex items-center justify-between">
                                    <span
                                      className={`
                                  inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:h-7 sm:w-7 sm:text-sm
                                  ${isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-700'}
                                `}
                                    >
                                      {day}
                                    </span>
                                    {hasAppointments && (
                                      <span className="text-xs font-medium text-gray-500">
                                        {dayAppointments.length}
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    {dayAppointments.slice(0, 2).map((apt) => (
                                      <Link
                                        key={apt._id}
                                        href={`/appointments/${apt._id}`}
                                        className={`
                                    block truncate rounded px-1 py-0.5 text-[10px] transition-colors sm:px-2 sm:py-1 sm:text-xs
                                    ${getStatusBgColor(apt.status)} border
                                  `}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span className="font-medium">{apt.appointmentTime}</span>
                                        <span className="ml-1 text-gray-600">{apt.patientName}</span>
                                      </Link>
                                    ))}
                                    {dayAppointments.length > 2 && (
                                      <div className="px-1 text-[10px] font-medium text-blue-600 sm:px-2 sm:text-xs">
                                        +{dayAppointments.length - 2} {t('calendar.more')}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {viewMode === 'agenda' && (
                    <div className="min-h-[260px] bg-white p-2 sm:min-h-[300px] sm:p-3">
                      {doctorIdValid && doctorIdFilter ? (
                        agendaSlotsLoading || agendaDaySlots === null ? (
                          <div className="flex h-48 items-center justify-center sm:h-56">
                            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600 sm:h-8 sm:w-8" />
                          </div>
                        ) : agendaDaySlots.length > 0 ? (
                          <ul className="space-y-1.5">
                            {agendaDaySlots.map((slot) => {
                              const apt = slot.available
                                ? null
                                : agendaAppointmentsByTime.get(slot.time);
                              return (
                                <li key={slot.time} className="flex gap-0 overflow-hidden rounded-md border border-gray-100">
                                  <div className="w-14 shrink-0 border-r border-gray-100 bg-gray-50/80 py-2 pl-2 text-xs font-semibold tabular-nums text-gray-800 sm:w-[4.25rem] sm:py-2.5 sm:pl-3 sm:text-sm">
                                    {slot.time}
                                  </div>
                                  <div className="min-w-0 flex-1 py-1.5 pr-2 sm:py-2 sm:pr-3">
                                    {slot.available ? (
                                      <div className="flex min-h-[2.25rem] flex-wrap items-center justify-between gap-1.5 rounded-md border border-dashed border-gray-200 bg-gray-50/60 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
                                        <span className="text-xs text-gray-500">
                                          {t('calendar.agendaFreeSlot')}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => openQuickAdd(slot.time)}
                                          className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-blue-700 sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-xs"
                                        >
                                          <Plus className="h-3.5 w-3.5" aria-hidden />
                                          {t('calendar.agendaAddAppointment')}
                                        </button>
                                      </div>
                                    ) : apt ? (
                                      <Link
                                        href={`/appointments/${apt._id}`}
                                        className={`block rounded-md border p-2 transition-colors hover:border-blue-300 hover:shadow-sm sm:rounded-lg sm:p-3 ${getStatusBgColor(apt.status)}`}
                                      >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                          <span className="text-sm font-semibold text-gray-900">
                                            {apt.appointmentTime}
                                          </span>
                                          <span
                                            className={`text-xs ${getStatusBgColor(apt.status)} rounded-full px-2 py-0.5`}
                                          >
                                            {apt.status}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-700">
                                          {formatAgendaPatientLine(apt)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {formatAgendaDoctorLine(apt)}
                                        </p>
                                      </Link>
                                    ) : (
                                      <div className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-600">
                                        {t('calendar.agendaSlotUnavailable')}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                            {agendaOrphanAppointments.length > 0 && (
                              <>
                                <li className="pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {t('calendar.agendaOtherTimes')}
                                </li>
                                {agendaOrphanAppointments.map((apt) => (
                                  <li key={apt._id}>
                                    <Link
                                      href={`/appointments/${apt._id}`}
                                      className={`block rounded-md border p-2 transition-colors hover:border-blue-300 hover:shadow-sm sm:rounded-lg sm:p-3 ${getStatusBgColor(apt.status)}`}
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <span className="text-sm font-semibold text-gray-900">
                                          {apt.appointmentTime}
                                        </span>
                                        <span
                                          className={`text-xs ${getStatusBgColor(apt.status)} rounded-full px-2 py-0.5`}
                                        >
                                          {apt.status}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-sm text-gray-700">
                                        {formatAgendaPatientLine(apt)}
                                      </p>
                                      <p className="text-xs text-gray-500">{formatAgendaDoctorLine(apt)}</p>
                                    </Link>
                                  </li>
                                ))}
                              </>
                            )}
                          </ul>
                        ) : (
                          <div>
                            <p className="mb-4 text-center text-sm text-gray-500">
                              {t('calendar.agendaNoWorkingHours')}
                            </p>
                            {agendaAppointments.length === 0 ? (
                              <p className="py-8 text-center text-sm text-gray-500">
                                {t('calendar.agendaEmpty')}
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {agendaAppointments.map((apt) => (
                                  <li key={apt._id}>
                                    <Link
                                      href={`/appointments/${apt._id}`}
                                      className={`block rounded-md border p-2 transition-colors hover:border-blue-300 hover:shadow-sm sm:rounded-lg sm:p-3 ${getStatusBgColor(apt.status)}`}
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <span className="text-sm font-semibold text-gray-900">
                                          {apt.appointmentTime}
                                        </span>
                                        <span
                                          className={`text-xs ${getStatusBgColor(apt.status)} rounded-full px-2 py-0.5`}
                                        >
                                          {apt.status}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-sm text-gray-700">
                                        {formatAgendaPatientLine(apt)}
                                      </p>
                                      <p className="text-xs text-gray-500">{formatAgendaDoctorLine(apt)}</p>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      ) : agendaAppointments.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-sm text-gray-500">{t('calendar.agendaEmpty')}</p>
                          <p className="mt-2 text-xs text-gray-400">{t('calendar.agendaSelectDoctorForSlots')}</p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {agendaAppointments.map((apt) => (
                            <li key={apt._id}>
                              <Link
                                href={`/appointments/${apt._id}`}
                                className={`block rounded-md border p-2 transition-colors hover:border-blue-300 hover:shadow-sm sm:rounded-lg sm:p-3 ${getStatusBgColor(apt.status)}`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {apt.appointmentTime}
                                  </span>
                                  <span
                                    className={`text-xs ${getStatusBgColor(apt.status)} rounded-full px-2 py-0.5`}
                                  >
                                    {apt.status}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-700">
                                  {formatAgendaPatientLine(apt)}
                                </p>
                                <p className="text-xs text-gray-500">{formatAgendaDoctorLine(apt)}</p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Legend */}
            {viewMode === 'month' && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] sm:mt-3 sm:gap-4 sm:text-xs">
              <div className="flex items-center gap-1.5 sm:space-x-2 sm:gap-0">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 sm:h-3 sm:w-3"></div>
                <span className="text-gray-600">{t('calendar.legend.confirmed')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:space-x-2 sm:gap-0">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500 sm:h-3 sm:w-3"></div>
                <span className="text-gray-600">{t('calendar.legend.pending')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:space-x-2 sm:gap-0">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 sm:h-3 sm:w-3"></div>
                <span className="text-gray-600">{t('calendar.legend.cancelled')}</span>
              </div>
            </div>
            )}
          </div>

          {/* Sidebar - Selected Date Details */}
          <div className="lg:w-72 xl:w-80">
            <div className="sticky top-4 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2.5 sm:px-4 sm:py-3">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white sm:gap-2 sm:text-base">
                  <CalendarIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  <span className="capitalize">
                    {selectedDate
                      ? getLocalizedDate(selectedDate)
                      : t('calendar.selectDate')}
                  </span>
                </h3>
              </div>

              <div className="p-2.5 sm:p-3">
                {!selectedDate ? (
                  <div className="py-6 text-center sm:py-8">
                    <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-gray-300 sm:h-10 sm:w-10" />
                    <p className="text-xs text-gray-500 sm:text-sm">
                      {t('calendar.clickToView')}
                    </p>
                  </div>
                ) : selectedDateAppointments.length === 0 ? (
                  <div className="py-6 text-center sm:py-8">
                    <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-gray-300 sm:h-10 sm:w-10" />
                    <p className="text-xs text-gray-500 sm:text-sm">
                      {t('calendar.noAppointments')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateAppointments.map((apt) => (
                      <Link
                        key={apt._id}
                        href={`/appointments/${apt._id}`}
                        className="block rounded-md border border-gray-200 p-2.5 transition-all hover:border-blue-300 hover:shadow-sm sm:p-3"
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${getStatusColor(apt.status)}`}></div>
                            <span className="text-xs font-semibold text-gray-900 sm:text-sm">
                              {apt.appointmentTime}
                            </span>
                          </div>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs ${getStatusBgColor(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-700 sm:text-sm">
                            <User className="mr-1.5 h-3.5 w-3.5 shrink-0 text-gray-400 sm:mr-2 sm:h-4 sm:w-4" />
                            <span className="font-medium">{apt.patientName}</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-gray-600 sm:text-sm">
                            <Clock className="mr-1.5 h-3.5 w-3.5 shrink-0 text-gray-400 sm:mr-2 sm:h-4 sm:w-4" />
                            <span>{apt.appointmentType}</span>
                          </div>
                          
                          {apt.location && (
                            <div className="flex items-center text-xs text-gray-600 sm:text-sm">
                              <MapPin className="mr-1.5 h-3.5 w-3.5 shrink-0 text-gray-400 sm:mr-2 sm:h-4 sm:w-4" />
                              <span>{apt.location}</span>
                            </div>
                          )}
                          
                          <div className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                            Dr. {apt.doctorName}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-2 rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:mt-3 sm:p-3">
              <h4 className="mb-2 text-xs font-semibold text-gray-700 sm:text-sm">
                {viewMode === 'month' ? t('calendar.thisMonth') : t('calendar.thisDay')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-blue-50 p-2 text-center sm:p-2.5">
                  <div className="text-lg font-bold text-blue-600 sm:text-2xl">{scopedForStats.length}</div>
                  <div className="text-[10px] text-gray-600 sm:text-xs">{t('calendar.total')}</div>
                </div>
                <div className="rounded-md bg-emerald-50 p-2 text-center sm:p-2.5">
                  <div className="text-lg font-bold text-emerald-600 sm:text-2xl">
                    {
                      scopedForStats.filter(
                        (apt) => (apt.status ?? '').toString().toLowerCase() === 'confirmed'
                      ).length
                    }
                  </div>
                  <div className="text-xs text-gray-600">{t('calendar.confirmed')}</div>
                </div>
                <div className="rounded-md bg-amber-50 p-2 text-center sm:p-2.5">
                  <div className="text-lg font-bold text-amber-600 sm:text-2xl">
                    {
                      scopedForStats.filter(
                        (apt) => (apt.status ?? '').toString().toLowerCase() === 'pending'
                      ).length
                    }
                  </div>
                  <div className="text-xs text-gray-600">{t('calendar.pending')}</div>
                </div>
                <div className="rounded-md bg-red-50 p-2 text-center sm:p-2.5">
                  <div className="text-lg font-bold text-red-600 sm:text-2xl">
                    {
                      scopedForStats.filter(
                        (apt) => (apt.status ?? '').toString().toLowerCase() === 'cancelled'
                      ).length
                    }
                  </div>
                  <div className="text-xs text-gray-600">{t('calendar.cancelled')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {quickAddOpen && doctorIdFilter && quickAddSlotTime && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-quick-add-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeQuickAdd();
            }}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 sm:px-4 sm:py-2.5">
                <h2 id="calendar-quick-add-title" className="text-sm font-semibold text-gray-900 sm:text-base">
                  {t('calendar.quickAddTitle')}
                </h2>
                <button
                  type="button"
                  onClick={closeQuickAdd}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label={t('common.close')}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <form onSubmit={submitQuickAdd} className="space-y-3 p-3 sm:p-4">
                <div className="rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 sm:text-sm">
                  <p>
                    <span className="font-medium text-gray-900">{t('appointments.doctorName')}: </span>
                    {doctorsList.find((d) => d._id === doctorIdFilter.trim())?.name ?? '—'}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium text-gray-900">{t('appointments.dateTime')}: </span>
                    {getLocalizedDate(currentDate)} · {quickAddSlotTime}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('appointments.selectPatient')} *
                  </label>
                  <div className="relative z-10">
                    <SearchablePatientSelect
                      value=""
                      syncPatient={quickAddPatient}
                      onChange={(p) => {
                        setQuickAddPatient(
                          p
                            ? {
                                _id: p._id,
                                patientId: p.patientId,
                                name: p.name,
                                email: p.email,
                                phone: p.phone,
                              }
                            : null
                        );
                        if (quickAddError) setQuickAddError(null);
                      }}
                      placeholder={t('appointments.placeholders.selectPatient')}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="calendar-quick-add-reason"
                    className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm"
                  >
                    {t('appointments.reason')} *
                  </label>
                  <textarea
                    id="calendar-quick-add-reason"
                    rows={2}
                    value={quickAddReason}
                    onChange={(e) => {
                      setQuickAddReason(e.target.value);
                      if (quickAddError) setQuickAddError(null);
                    }}
                    placeholder={t('appointments.placeholders.reason')}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                {quickAddError && (
                  <p className="text-xs text-red-600 sm:text-sm" role="alert">
                    {quickAddError}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={closeQuickAdd}
                    disabled={quickAddSubmitting}
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={quickAddSubmitting}
                    className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {quickAddSubmitting ? t('appointments.creating') : t('appointments.createAppointment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
