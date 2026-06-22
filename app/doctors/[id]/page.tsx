'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Building2,
  Award,
  Calendar,
  Clock,
  User,
  Briefcase,
  Stethoscope,
  CalendarDays,
  CalendarPlus,
  ExternalLink,
  FileText,
  CheckCircle,
  XCircle,
  Languages,
  Star,
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';

interface DoctorRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  specialization?: string;
  department?: string;
  licenseNumber?: string;
  licenseCertificate?: { fileName?: string; fileType?: string; data?: string; uploadedAt?: string };
  approvalStatus?: string;
  licenseVerification?: { status?: string; method?: string; message?: string; checkedAt?: string };
  rejectionReason?: string;
  qualifications?: string[];
  languages?: string[];
  yearsOfExperience?: number;
  rating?: number;
  ratingCount?: number;
  bio?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ScheduleResponse {
  effective?: {
    slotDurationMinutes?: number;
    websiteBookingEnabled?: boolean;
    workingHours?: { start?: string; end?: string; days?: string[] };
  };
}

function formatDayLabel(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { t, translationsLoaded } = useTranslations();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];

  const [doctor, setDoctor] = useState<DoctorRecord | null>(null);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'admin';

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [docRes, schedRes] = await Promise.all([
        fetch(`/api/doctors?id=${encodeURIComponent(id)}`),
        fetch(`/api/doctors/${encodeURIComponent(id)}/schedule`),
      ]);

      if (!docRes.ok) {
        if (docRes.status === 404) {
          setDoctor(null);
          setLoading(false);
          return;
        }
        throw new Error('fetch');
      }

      const doc = await docRes.json();
      if (doc.role && doc.role !== 'doctor') {
        router.replace('/doctors');
        return;
      }
      setDoctor(doc);

      if (schedRes.ok) {
        const s = await schedRes.json();
        setSchedule(s);
      } else {
        setSchedule(null);
      }
    } catch {
      setError(t('doctors.detail.loadError'));
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  }, [id, router, t]);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    if (id) load();
  }, [isAdmin, id, load, router]);

  const handleApproval = async (action: 'approve' | 'reject' | 'auto-verify') => {
    if (!doctor) return;
    const reason = action === 'reject' ? prompt('Reason for rejection') || '' : '';
    const res = await fetch(`/api/users/${doctor._id}/approval`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (res.ok) {
      load();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update approval status');
    }
  };

  const approvalBadgeClass = (status?: string) => {
    if (!status || status === 'approved') return 'bg-green-50 text-green-700 ring-green-200';
    if (status === 'rejected') return 'bg-red-50 text-red-700 ring-red-200';
    return 'bg-amber-50 text-amber-800 ring-amber-200';
  };

  const genderLabel = (g?: string) => {
    switch (g) {
      case 'male':
        return t('doctors.new.genderMale');
      case 'female':
        return t('doctors.new.genderFemale');
      case 'other':
        return t('doctors.new.genderOther');
      case 'prefer-not-to-say':
        return t('doctors.new.genderPreferNot');
      default:
        return t('doctors.notAvailable');
    }
  };

  if (!translationsLoaded || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!id) {
    return null;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('doctors.detail.title')}
        description={t('doctors.detail.description')}
        dense
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/doctors"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('doctors.detail.backToList')}
            </Link>
            {doctor && (
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={`/doctors/${doctor._id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                  {t('doctors.detail.editProfile')}
                </Link>
                <button
                  type="button"
                  onClick={() => handleApproval('auto-verify')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Auto-check
                </button>
                {doctor.approvalStatus !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleApproval('approve')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                )}
                {doctor.approvalStatus !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => handleApproval('reject')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
          ) : !doctor ? (
            <div className="rounded-lg border border-gray-100 bg-white p-4 text-center text-sm text-gray-600">
              {t('doctors.detail.notFound')}
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="overflow-hidden rounded-lg border border-gray-100 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                <div className="border-b border-gray-100 px-3 py-2.5 sm:flex sm:items-start sm:justify-between">
                  <div className="flex gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-base font-bold text-white shadow-sm">
                      {doctor.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">{doctor.name}</h1>
                      <p className="mt-0.5 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">{t('doctors.detail.roleLabel')}:</span>{' '}
                        <span className="capitalize">{doctor.role}</span>
                        {doctor.specialization && (
                          <>
                            {' · '}
                            <span className="inline-flex items-center gap-1 text-blue-700">
                              <Stethoscope className="h-4 w-4" />
                              {doctor.specialization}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/80 px-3 py-1.5">
                  <span className="mr-1 self-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
                    {t('doctors.detail.quickActions')}
                  </span>
                  <Link
                    href="/appointments"
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 sm:text-sm"
                  >
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                    {t('doctors.detail.openAppointments')}
                  </Link>
                  <Link
                    href={`/calendar?doctorId=${encodeURIComponent(id || '')}`}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 sm:text-sm"
                  >
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    {t('doctors.detail.openCalendar')}
                  </Link>
                  <Link
                    href={`/appointments/new?doctorId=${encodeURIComponent(id || '')}`}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 sm:text-sm"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    {t('doctors.detail.newAppointment')}
                  </Link>
                </div>

                <div className="grid gap-2.5 p-3 md:grid-cols-2">
                  {/* Contact */}
                  <section className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
                    <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <Mail className="h-4 w-4" />
                      {t('doctors.detail.contact')}
                    </h2>
                    <dl className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-gray-500">{t('doctors.email')}</dt>
                        <dd>
                          <a href={`mailto:${doctor.email}`} className="font-medium text-blue-700 hover:underline">
                            {doctor.email}
                          </a>
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-gray-500">{t('doctors.phone')}</dt>
                        <dd className="font-medium text-gray-900">
                          {doctor.phone ? (
                            <a href={`tel:${doctor.phone}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                              <Phone className="h-3.5 w-3.5" />
                              {doctor.phone}
                            </a>
                          ) : (
                            t('doctors.notAvailable')
                          )}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-gray-500">{t('doctors.new.address')}</dt>
                        <dd className="text-gray-900">{doctor.address || t('doctors.notAvailable')}</dd>
                      </div>
                    </dl>
                  </section>

                  {/* Professional */}
                  <section className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
                    <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <Briefcase className="h-4 w-4" />
                      {t('doctors.detail.professional')}
                    </h2>
                    <dl className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">{t('doctors.specialization')}</dt>
                        <dd className="font-medium text-gray-900">{doctor.specialization || t('doctors.notAvailable')}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">{t('doctors.new.department')}</dt>
                        <dd className="flex items-center gap-1 text-gray-900">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          {doctor.department || t('doctors.notAvailable')}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">{t('doctors.detail.license')}</dt>
                        <dd className="font-mono text-gray-900">{doctor.licenseNumber || t('doctors.notAvailable')}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">Approval</dt>
                        <dd>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${approvalBadgeClass(doctor.approvalStatus)}`}>
                            {(doctor.approvalStatus || 'approved').replace(/_/g, ' ')}
                          </span>
                          {doctor.licenseVerification?.message && (
                            <p className="mt-1 text-xs text-gray-600">{doctor.licenseVerification.message}</p>
                          )}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">Certificate</dt>
                        <dd>
                          {doctor.licenseCertificate?.data ? (
                            <a
                              href={doctor.licenseCertificate.data}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {doctor.licenseCertificate.fileName || 'View certificate'}
                            </a>
                          ) : (
                            t('doctors.notAvailable')
                          )}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">{t('doctors.detail.experience')}</dt>
                        <dd className="text-gray-900">
                          {doctor.yearsOfExperience != null
                            ? t('doctors.detail.years', { n: doctor.yearsOfExperience })
                            : t('doctors.notAvailable')}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">Rating</dt>
                        <dd className="flex items-center gap-1 text-gray-900">
                          {doctor.rating != null ? (
                            <>
                              <Star className="h-3.5 w-3.5 text-amber-500" />
                              {doctor.rating.toFixed(1)} / 5
                              {doctor.ratingCount ? <span className="text-gray-500">({doctor.ratingCount})</span> : null}
                            </>
                          ) : (
                            t('doctors.notAvailable')
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="mb-1 text-gray-500">{t('doctors.detail.qualifications')}</dt>
                        <dd>
                          {doctor.qualifications && doctor.qualifications.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {doctor.qualifications.map((q, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                                >
                                  <Award className="h-3 w-3" />
                                  {q}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">{t('doctors.notAvailable')}</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="mb-1 flex items-center gap-1 text-gray-500">
                          <Languages className="h-3.5 w-3.5" />
                          Languages
                        </dt>
                        <dd>
                          {doctor.languages && doctor.languages.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {doctor.languages.map((language, i) => (
                                <span
                                  key={`${language}-${i}`}
                                  className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                                >
                                  {language}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">{t('doctors.notAvailable')}</span>
                          )}
                        </dd>
                      </div>
                      {doctor.bio && (
                        <div>
                          <dt className="mb-1 text-gray-500">{t('doctors.detail.bio')}</dt>
                          <dd className="leading-relaxed text-gray-800">{doctor.bio}</dd>
                        </div>
                      )}
                    </dl>
                  </section>

                  {/* Personal */}
                  <section className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
                    <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <User className="h-4 w-4" />
                      {t('doctors.detail.personal')}
                    </h2>
                    <dl className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">{t('doctors.new.dateOfBirth')}</dt>
                        <dd className="text-gray-900">
                          {doctor.dateOfBirth
                            ? new Date(doctor.dateOfBirth).toLocaleDateString()
                            : t('doctors.notAvailable')}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-36 shrink-0 text-gray-500">{t('doctors.new.gender')}</dt>
                        <dd className="text-gray-900">{genderLabel(doctor.gender)}</dd>
                      </div>
                    </dl>
                  </section>

                  {/* Schedule */}
                  <section className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
                    <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <Clock className="h-4 w-4" />
                      {t('doctors.detail.schedule')}
                    </h2>
                    {schedule?.effective ? (
                      <dl className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          <div>
                            <dt className="text-gray-500">{t('doctors.detail.slotDuration')}</dt>
                            <dd className="font-medium text-gray-900">
                              {schedule.effective.slotDurationMinutes ?? 30} {t('doctors.detail.minutesShort')}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">{t('doctors.detail.websiteBooking')}</dt>
                            <dd className="font-medium text-gray-900">
                              {schedule.effective.websiteBookingEnabled !== false
                                ? t('doctors.detail.enabled')
                                : t('doctors.detail.disabled')}
                            </dd>
                          </div>
                        </div>
                        <div>
                          <dt className="text-gray-500">{t('doctors.detail.workingHours')}</dt>
                          <dd className="mt-1 font-mono text-gray-900">
                            {schedule.effective.workingHours?.start ?? '—'} – {schedule.effective.workingHours?.end ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="mb-1 text-gray-500">{t('doctors.detail.daysActive')}</dt>
                          <dd className="flex flex-wrap gap-1">
                            {(schedule.effective.workingHours?.days ?? []).map((d) => (
                              <span
                                key={d}
                                className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                              >
                                {formatDayLabel(d)}
                              </span>
                            ))}
                          </dd>
                        </div>
                        <Link
                          href={`/doctors/${doctor._id}/edit`}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 sm:text-sm"
                        >
                          {t('doctors.detail.editProfile')}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </dl>
                    ) : (
                      <p className="text-xs text-gray-600 sm:text-sm">{t('doctors.detail.noSchedule')}</p>
                    )}
                  </section>

                  {/* Account meta */}
                  <section className="md:col-span-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-2.5">
                    <h2 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      {t('doctors.detail.account')}
                    </h2>
                    <p className="text-xs text-gray-600 sm:text-sm">
                      <span className="font-medium text-gray-700">{t('doctors.detail.memberSince')}:</span>{' '}
                      {doctor.createdAt ? new Date(doctor.createdAt).toLocaleString() : t('doctors.notAvailable')}
                      {' · '}
                      <span className="font-medium text-gray-700">{t('doctors.detail.lastUpdated')}:</span>{' '}
                      {doctor.updatedAt ? new Date(doctor.updatedAt).toLocaleString() : t('doctors.notAvailable')}
                    </p>
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
