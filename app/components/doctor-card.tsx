'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BadgeCheck, Briefcase, Languages, Star, Stethoscope } from 'lucide-react';

export type PublicDoctor = {
  id: string;
  name: string;
  specialization: string;
  department: string;
  consultationFee: number;
  currency: string;
  rating: number | null;
  ratingCount: number;
  yearsOfExperience: number | null;
  languages: string[];
  qualifications: string[];
  bio: string;
  gender: string;
  practitionerType?: 'doctor' | 'herbalist';
  photoUrl: string;
  slotDurationMinutes: number;
};

export function formatFee(fee: number, currency = 'GHS') {
  if (!fee || fee <= 0) return 'Free';
  return `${currency} ${Number.isInteger(fee) ? fee : fee.toFixed(2)}`;
}

export function isHerbalist(d?: { practitionerType?: string }) {
  return d?.practitionerType === 'herbalist';
}

export function doctorTitle(name: string, practitionerType?: string) {
  if (practitionerType === 'herbalist') return name.replace(/^dr\.?\s+/i, '');
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

export function DoctorAvatar({
  doctor,
  className = 'h-20 w-20',
}: {
  doctor: Pick<PublicDoctor, 'name' | 'photoUrl'> & { practitionerType?: string };
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = doctor.name
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  if (failed || !doctor.photoUrl) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 font-display text-xl font-semibold text-brand-800`}
        aria-hidden
      >
        {initials || <Stethoscope className="h-6 w-6" />}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={doctor.photoUrl}
      alt={doctorTitle(doctor.name, (doctor as PublicDoctor).practitionerType)}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} shrink-0 rounded-2xl bg-brand-50 object-cover`}
    />
  );
}

export function DoctorCard({ doctor, portal = false }: { doctor: PublicDoctor; portal?: boolean }) {
  const profileHref = portal ? `/patient-portal/doctors/${doctor.id}` : `/find-doctors/${doctor.id}`;
  const bookHref = portal ? `/patient-portal/appointments/new?doctorId=${doctor.id}` : `/find-doctors/${doctor.id}?book=1`;
  const herbal = isHerbalist(doctor);
  const specialty = doctor.specialization || doctor.department || (herbal ? 'Herbal medicine' : 'General Practice');
  return (
    <article className="qw-card flex h-full flex-col p-5">
      <div className="flex items-start gap-4">
        <DoctorAvatar doctor={doctor} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-lg font-semibold leading-snug text-gray-900">
            <span className="truncate">{doctorTitle(doctor.name, doctor.practitionerType)}</span>
            <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="Verified licence" />
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-medium text-brand-700">
            {specialty}
            {herbal && <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-700">Herbalist</span>}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
            {doctor.rating != null && (
              <span className="inline-flex items-center gap-1 font-semibold text-accent-700">
                <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" />
                {Number(doctor.rating).toFixed(1)}
                {doctor.ratingCount ? <span className="font-normal text-gray-500">({doctor.ratingCount})</span> : null}
              </span>
            )}
            {doctor.yearsOfExperience != null && doctor.yearsOfExperience > 0 && (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                {doctor.yearsOfExperience} yrs
              </span>
            )}
          </div>
        </div>
      </div>

      {doctor.bio ? (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-gray-600">{doctor.bio}</p>
      ) : doctor.qualifications.length ? (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-gray-600">{doctor.qualifications.join(' · ')}</p>
      ) : null}

      {doctor.languages.length > 0 && (
        <p className="mb-4 mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <Languages className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{doctor.languages.join(', ')}</span>
        </p>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Consultation fee</p>
          <p className="font-display text-2xl font-semibold text-brand-800">{formatFee(doctor.consultationFee, doctor.currency)}</p>
          <p className="text-xs text-gray-500">{doctor.slotDurationMinutes} min session</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={profileHref}
            className="inline-flex items-center justify-center rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
          >
            Profile
          </Link>
          <Link
            href={bookHref}
            className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Book &amp; pay
          </Link>
        </div>
      </div>
    </article>
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="qw-card h-64 animate-pulse p-5" aria-hidden>
      <div className="flex gap-4">
        <div className="h-20 w-20 rounded-2xl bg-gray-100" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-3/4 rounded bg-gray-100" />
          <div className="h-3 w-1/2 rounded bg-gray-100" />
          <div className="h-3 w-1/3 rounded bg-gray-100" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-3 rounded bg-gray-100" />
        <div className="h-3 w-5/6 rounded bg-gray-100" />
      </div>
    </div>
  );
}
