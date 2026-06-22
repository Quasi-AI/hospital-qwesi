'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Stethoscope, Mail, BriefcaseMedical, CalendarPlus, Eye, Languages, Star } from 'lucide-react';

export default function PatientDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [canBook, setCanBook] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/patient-portal/doctors').then((res) => res.json()),
      fetch('/api/patient-portal/consultation-access').then((res) => res.json()),
    ])
      .then(([doctorData, accessData]) => {
        setDoctors(doctorData.doctors || []);
        setCanBook(Boolean(accessData.allowed));
        setAccessMessage(accessData.message || '');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Doctors</h1>
        <p className="text-sm text-slate-600">Browse approved doctors. Booking requires an active subscription or pay-as-you-go credit.</p>
      </div>
      {!canBook && accessMessage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {accessMessage}{' '}
          <Link href="/patient-portal/subscriptions" className="font-semibold underline">
            Subscribe
          </Link>
          {' '}or use pay-as-you-go before booking.
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No doctor profiles are available yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => (
            <article key={doctor._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {doctor.image ? (
                  <img src={doctor.image} alt={doctor.name} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Stethoscope className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-950">{doctor.name}</h2>
                  <p className="text-sm text-teal-700">{doctor.specialization || doctor.department || 'Doctor'}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    {doctor.email}
                  </p>
                </div>
              </div>
              {doctor.bio ? <p className="mt-4 text-sm leading-relaxed text-slate-600">{doctor.bio}</p> : null}
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {doctor.yearsOfExperience != null ? (
                  <p className="flex items-center gap-2">
                    <BriefcaseMedical className="h-4 w-4 text-slate-400" />
                    {doctor.yearsOfExperience} years experience
                  </p>
                ) : null}
                {doctor.qualifications?.length ? <p>{doctor.qualifications.join(', ')}</p> : null}
                {doctor.languages?.length ? (
                  <p className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-slate-400" />
                    {doctor.languages.join(', ')}
                  </p>
                ) : null}
                {doctor.rating != null ? (
                  <p className="flex items-center gap-2 font-medium text-amber-700">
                    <Star className="h-4 w-4 text-amber-500" />
                    {Number(doctor.rating).toFixed(1)} / 5{doctor.ratingCount ? ` (${doctor.ratingCount})` : ''}
                  </p>
                ) : null}
              </div>
              <Link
                href={`/patient-portal/doctors/${doctor._id}`}
                className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                View details
              </Link>
              {canBook ? (
                <Link
                  href={`/patient-portal/appointments/new?doctorId=${doctor._id}`}
                  className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Book appointment
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-200 px-3 text-sm font-semibold text-slate-500"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Payment required
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
