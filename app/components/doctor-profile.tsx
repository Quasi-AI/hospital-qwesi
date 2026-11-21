'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Award, BadgeCheck, Briefcase, Clock, CreditCard, Languages, ShieldCheck, Star, Video } from 'lucide-react';
import { DoctorAvatar, doctorTitle, formatFee, type PublicDoctor } from './doctor-card';

export function DoctorProfile({ id, portal = false }: { id: string; portal?: boolean }) {
  const { data: session, status } = useSession();
  const [doctor, setDoctor] = useState<PublicDoctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/booking/doctors?id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('nf');
        const data = await res.json();
        if (!cancelled) setDoctor(data);
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="qw-card h-96 animate-pulse" aria-busy />;
  }
  if (notFound || !doctor) {
    return (
      <div className="qw-card p-10 text-center">
        <p className="font-semibold text-gray-900">This doctor isn’t available for booking.</p>
        <Link href="/find-doctors" className="mt-4 inline-flex rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">
          Browse all doctors
        </Link>
      </div>
    );
  }

  const bookPath = `/patient-portal/appointments/new?doctorId=${doctor.id}`;
  const role = session?.user?.role;
  const isPatient = status === 'authenticated' && role === 'patient';
  const staffViewing = status === 'authenticated' && role !== 'patient';
  const bookHref = isPatient || portal ? bookPath : `/login?next=${encodeURIComponent(bookPath)}`;
  const specialty = doctor.specialization || doctor.department || 'General Practice';

  const BookButton = ({ className = '' }: { className?: string }) =>
    staffViewing ? (
      <p className={`rounded-xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-600 ${className}`}>
        Sign in with a patient account to book.
      </p>
    ) : (
      <Link
        href={bookHref}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 ${className}`}
      >
        <CreditCard className="h-5 w-5" />
        {doctor.consultationFee > 0 ? `Book & pay ${formatFee(doctor.consultationFee, doctor.currency)}` : 'Book free consultation'}
      </Link>
    );

  return (
    <div>
      <Link href={portal ? '/patient-portal/doctors' : '/find-doctors'} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-800">
        <ArrowLeft className="h-4 w-4" /> All doctors
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="qw-card !transform-none p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <DoctorAvatar doctor={doctor} className="h-28 w-28 sm:h-32 sm:w-32" />
              <div className="min-w-0">
                <h1 className="font-display flex flex-wrap items-center gap-2 text-3xl font-semibold text-brand-950">
                  {doctorTitle(doctor.name, doctor.practitionerType)}
                  {doctor.verified !== false ? <BadgeCheck className="h-6 w-6 text-brand-600" aria-label="Verified licence" /> : <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Not verified yet</span>}
                </h1>
                <p className="mt-1 text-lg font-medium text-brand-700">{specialty}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {doctor.rating != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 font-semibold text-accent-700">
                      <Star className="h-4 w-4 fill-accent-400 text-accent-400" />
                      {Number(doctor.rating).toFixed(1)}
                      {doctor.ratingCount ? ` (${doctor.ratingCount})` : ''}
                    </span>
                  )}
                  {doctor.yearsOfExperience ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-800">
                      <Briefcase className="h-4 w-4" /> {doctor.yearsOfExperience} years experience
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-800">
                    <ShieldCheck className="h-4 w-4" /> Licence verified
                  </span>
                </div>
              </div>
            </div>
          </section>

          {doctor.bio && (
            <section className="qw-card !transform-none p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-700">{doctor.bio}</p>
            </section>
          )}

          {(doctor.qualifications.length > 0 || doctor.languages.length > 0) && (
            <section className="qw-card !transform-none grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 sm:p-8">
              {doctor.qualifications.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Award className="h-5 w-5 text-brand-600" /> Qualifications
                  </h2>
                  <ul className="mt-3 space-y-1.5 text-gray-700">
                    {doctor.qualifications.map((q) => (
                      <li key={q}>• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {doctor.languages.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Languages className="h-5 w-5 text-brand-600" /> Languages
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {doctor.languages.map((l) => (
                      <span key={l} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="qw-card !transform-none overflow-hidden">
            <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">Consultation fee</p>
              <p className="font-display mt-1 text-4xl font-semibold">{formatFee(doctor.consultationFee, doctor.currency)}</p>
              <p className="mt-1 text-sm text-brand-100">per {doctor.slotDurationMinutes}-minute session</p>
            </div>
            <div className="space-y-4 p-6">
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <Video className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> Video, audio or chat — you choose
                </li>
                <li className="flex gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> Pick a live slot from their calendar
                </li>
                <li className="flex gap-3">
                  <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> Pay securely by card or local payment method
                </li>
              </ul>
              <div className="hidden lg:block">
                <BookButton className="w-full" />
              </div>
              <p className="text-center text-xs text-gray-500">
                {isPatient || portal ? 'You’ll choose a time and pay on the next page.' : 'You’ll be asked to log in or sign up first.'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky mobile booking bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Fee</p>
            <p className="font-display text-xl font-semibold text-brand-800">{formatFee(doctor.consultationFee, doctor.currency)}</p>
          </div>
          <BookButton className="!px-5 !py-3 text-sm" />
        </div>
      </div>
    </div>
  );
}
