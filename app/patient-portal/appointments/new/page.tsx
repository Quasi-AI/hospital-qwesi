'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Stethoscope,
  Video,
} from 'lucide-react';

type Doctor = {
  _id: string;
  name: string;
  email: string;
  specialization?: string;
  department?: string;
};

type Slot = {
  time: string;
  available: boolean;
};

type ConsultationAccess = {
  allowed: boolean;
  source: 'free' | 'subscription' | 'payg' | 'payment_required';
  previousConsultationCount: number;
  freeConsultationsRemaining: number;
  hasActiveSubscription: boolean;
  message: string;
  activeSubscription?: {
    planName: string;
    currentPeriodEnd: string;
  };
  paygTransaction?: {
    reference: string;
    itemName: string;
    amount: number;
    currency: 'GHS' | 'USD';
  };
};

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function NewPatientAppointmentFallback() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
        <p className="mt-2 text-sm text-gray-600">Loading booking...</p>
      </div>
    </div>
  );
}

export default function NewPatientAppointmentPage() {
  return (
    <Suspense fallback={<NewPatientAppointmentFallback />}>
      <NewPatientAppointmentPageContent />
    </Suspense>
  );
}

function NewPatientAppointmentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || '';
  const preselectedDoctorId = searchParams.get('doctorId') || '';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [access, setAccess] = useState<ConsultationAccess | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [form, setForm] = useState({
    doctorId: preselectedDoctorId,
    appointmentDate: searchParams.get('date') || todayYmd(),
    appointmentTime: searchParams.get('time') || '',
    reason: '',
    notes: '',
    includeVideoCall: true,
    consultationType: 'video' as 'video' | 'audio' | 'chat',
    sessionDuration: 30,
  });

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor._id === form.doctorId) || null,
    [doctors, form.doctorId]
  );

  const refreshAccess = useCallback(async () => {
    const res = await fetch('/api/patient-portal/consultation-access');
    if (res.ok) {
      setAccess(await res.json());
    }
  }, []);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [doctorRes, accessRes] = await Promise.all([
        fetch('/api/patient-portal/doctors'),
        fetch('/api/patient-portal/consultation-access'),
      ]);
      if (doctorRes.ok) {
        const data = await doctorRes.json();
        setDoctors(data.doctors || []);
      }
      if (accessRes.ok) {
        setAccess(await accessRes.json());
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not load booking details.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;

    const verify = async () => {
      setMessage({ type: 'info', text: 'Verifying your payment...' });
      const res = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.ok) {
        setMessage({ type: 'success', text: 'Payment verified. You can now book your consultation.' });
        await refreshAccess();
        const next = new URLSearchParams(searchParams.toString());
        next.delete('reference');
        router.replace(`/patient-portal/appointments/new${next.toString() ? `?${next.toString()}` : ''}`);
      } else {
        setMessage({ type: 'error', text: data.error || 'Payment verification failed.' });
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [reference, refreshAccess, router, searchParams]);

  useEffect(() => {
    if (!form.doctorId || !form.appointmentDate) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    const pendingTime = form.appointmentTime;
    setSlotsLoading(true);
    setSlots([]);

    const params = new URLSearchParams({
      doctorId: form.doctorId,
      date: form.appointmentDate,
    });

    fetch(`/api/patient-portal/appointments/slots?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const nextSlots = Array.isArray(data.slots) ? data.slots : [];
        setSlots(nextSlots);
        if (pendingTime && !nextSlots.some((slot: Slot) => slot.time === pendingTime && slot.available)) {
          setForm((current) =>
            current.appointmentTime === pendingTime ? { ...current, appointmentTime: '' } : current
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.doctorId, form.appointmentDate]);

  const accessTone = access?.allowed
    ? access.source === 'free'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-blue-200 bg-blue-50 text-blue-800'
    : 'border-amber-200 bg-amber-50 text-amber-900';

  const startPaygPayment = async () => {
    setPaying(true);
    setMessage({ type: 'info', text: 'Opening Paystack checkout...' });
    try {
      const callbackParams = new URLSearchParams();
      if (form.doctorId) callbackParams.set('doctorId', form.doctorId);
      if (form.appointmentDate) callbackParams.set('date', form.appointmentDate);
      if (form.appointmentTime) callbackParams.set('time', form.appointmentTime);
      const callbackPath = `/patient-portal/appointments/new${callbackParams.toString() ? `?${callbackParams.toString()}` : ''}`;
      const res = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'payg',
          itemId: 'doctor-virtual-consultation',
          amount: 80,
          callbackPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not start payment.' });
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      setMessage({ type: 'error', text: 'Could not start payment.' });
    } finally {
      setPaying(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!access?.allowed) {
      setMessage({ type: 'error', text: access?.message || 'Payment is required before booking.' });
      return;
    }
    if (!form.doctorId || !form.appointmentDate || !form.appointmentTime || !form.reason.trim()) {
      setMessage({ type: 'error', text: 'Please select a doctor, date, time, and reason.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/patient-portal/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not book appointment.' });
        if (data.access) setAccess(data.access);
        return;
      }
      setMessage({ type: 'success', text: 'Appointment booked successfully.' });
      router.push('/patient-portal/appointments');
    } catch {
      setMessage({ type: 'error', text: 'Could not book appointment.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <NewPatientAppointmentFallback />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/patient-portal/appointments"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to appointments
          </Link>
          <h1 className="text-xl font-bold text-gray-950">Book appointment</h1>
          <p className="mt-0.5 text-sm text-gray-600">Choose any doctor and schedule a consultation.</p>
        </div>
        <Link
          href="/patient-portal/doctors"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Stethoscope className="h-4 w-4" />
          View doctors
        </Link>
      </div>

      {message ? (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : message.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : message.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          )}
          <span>{message.text}</span>
        </div>
      ) : null}

      {access ? (
        <section className={`rounded-lg border px-4 py-3 ${accessTone}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{access.message}</p>
                <p className="mt-0.5 text-xs opacity-80">
                  Previous doctor consultations: {access.previousConsultationCount}
                </p>
              </div>
            </div>
            {!access.allowed ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={paying}
                  onClick={startPaygPayment}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Pay GHS 80
                </button>
                <Link
                  href="/patient-portal/subscriptions"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900 hover:bg-amber-50"
                >
                  Subscribe
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-950">Doctor</h2>
          </div>
          <select
            value={form.doctorId}
            onChange={(event) => setForm((current) => ({ ...current, doctorId: event.target.value }))}
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          >
            <option value="">Select a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.name}
                {doctor.specialization || doctor.department ? ` - ${doctor.specialization || doctor.department}` : ''}
              </option>
            ))}
          </select>
          {selectedDoctor ? (
            <div className="mt-3 rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-900">
              <p className="font-semibold">{selectedDoctor.name}</p>
              <p className="text-xs">{selectedDoctor.specialization || selectedDoctor.department || 'Doctor'}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-950">Date and time</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[16rem_1fr]">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Date</label>
              <input
                type="date"
                min={todayYmd()}
                value={form.appointmentDate}
                onChange={(event) => setForm((current) => ({ ...current, appointmentDate: event.target.value }))}
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-700">Available slots</span>
              {!form.doctorId ? (
                <p className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Select a doctor first.
                </p>
              ) : slotsLoading ? (
                <div className="flex h-10 items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  Loading slots...
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No slots are available for this date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => slot.available && setForm((current) => ({ ...current, appointmentTime: slot.time }))}
                      className={`h-9 rounded-md border px-2 text-sm font-medium transition ${
                        form.appointmentTime === slot.time
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : slot.available
                            ? 'border-gray-200 bg-white text-gray-800 hover:border-teal-300 hover:bg-teal-50'
                            : 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-950">Consultation</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_16rem]">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, includeVideoCall: true }))}
                  className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                    form.includeVideoCall ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Video consult
                </button>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, includeVideoCall: false }))}
                  className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                    !form.includeVideoCall ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  In-person visit
                </button>
              </div>

              {form.includeVideoCall ? (
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'video', label: 'Video', icon: Video },
                    { value: 'audio', label: 'Audio', icon: Phone },
                    { value: 'chat', label: 'Chat', icon: MessageCircle },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          consultationType: value as 'video' | 'audio' | 'chat',
                        }))
                      }
                      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold ${
                        form.consultationType === value
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Briefly describe what you want to discuss."
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Anything else the doctor should know."
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</p>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-gray-400" />
                  {selectedDoctor?.name || 'No doctor selected'}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {form.appointmentDate} {form.appointmentTime || ''}
                </p>
                <p className="flex items-center gap-2">
                  {form.includeVideoCall ? <Video className="h-4 w-4 text-gray-400" /> : <Calendar className="h-4 w-4 text-gray-400" />}
                  {form.includeVideoCall ? `${form.consultationType} consultation` : 'In-person visit'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/patient-portal/appointments"
            className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !access?.allowed}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Book appointment
          </button>
        </div>
      </form>
    </div>
  );
}
