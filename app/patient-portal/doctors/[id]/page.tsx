'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BriefcaseMedical,
  CalendarPlus,
  Languages,
  Mail,
  MapPin,
  Phone,
  Star,
  Stethoscope,
} from 'lucide-react';

type Doctor = {
  _id: string;
  name: string;
  email: string;
  image?: string;
  specialization?: string;
  department?: string;
  licenseNumber?: string;
  qualifications?: string[];
  languages?: string[];
  yearsOfExperience?: number;
  rating?: number;
  ratingCount?: number;
  bio?: string;
  phone?: string;
  address?: string;
};

export default function PatientDoctorDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [canBook, setCanBook] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/patient-portal/doctors?id=${encodeURIComponent(id)}`),
      fetch('/api/patient-portal/consultation-access'),
    ])
      .then(async ([doctorRes, accessRes]) => {
        const data = await doctorRes.json().catch(() => ({}));
        if (!doctorRes.ok) throw new Error(data.error || 'Doctor not found');
        const accessData = await accessRes.json().catch(() => ({}));
        if (!cancelled) {
          setDoctor(data.doctor);
          setCanBook(Boolean(accessData.allowed));
          setAccessMessage(accessData.message || '');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Doctor not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6">
      <Link href="/patient-portal/doctors" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Back to doctors
      </Link>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : error || !doctor ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'Doctor not found'}</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {doctor.image ? (
                <img src={doctor.image} alt={doctor.name} className="h-28 w-28 rounded-lg object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                  <Stethoscope className="h-10 w-10" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-slate-950">{doctor.name}</h1>
                <p className="mt-1 text-sm font-medium text-teal-700">
                  {doctor.specialization || doctor.department || 'Doctor'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {doctor.email}
                  </span>
                  {doctor.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {doctor.phone}
                    </span>
                  ) : null}
                </div>
              </div>
              {canBook ? (
                <Link
                  href={`/patient-portal/appointments/new?doctorId=${doctor._id}`}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Book appointment
                </Link>
              ) : (
                <div className="max-w-xs rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {accessMessage || 'Payment is required before booking.'}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Profile</h2>
              <p className="text-sm leading-relaxed text-slate-700">{doctor.bio || 'No biography has been added yet.'}</p>
            </section>
            <section className="space-y-2 text-sm text-slate-700">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Professional details</h2>
              {doctor.yearsOfExperience != null ? (
                <p className="flex items-center gap-2">
                  <BriefcaseMedical className="h-4 w-4 text-slate-400" />
                  {doctor.yearsOfExperience} years experience
                </p>
              ) : null}
              {doctor.rating != null ? (
                <p className="flex items-center gap-2 font-medium text-amber-700">
                  <Star className="h-4 w-4 text-amber-500" />
                  {doctor.rating.toFixed(1)} / 5{doctor.ratingCount ? ` (${doctor.ratingCount})` : ''}
                </p>
              ) : null}
              {doctor.licenseNumber ? (
                <p className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-slate-400" />
                  License {doctor.licenseNumber}
                </p>
              ) : null}
              {doctor.address ? (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {doctor.address}
                </p>
              ) : null}
              {doctor.qualifications?.length ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {doctor.qualifications.map((item) => (
                    <span key={item} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
              {doctor.languages?.length ? (
                <div className="pt-1">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Languages className="h-4 w-4 text-slate-400" />
                    Languages
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {doctor.languages.map((item) => (
                      <span key={item} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
