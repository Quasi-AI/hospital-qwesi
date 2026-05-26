'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Phone,
  Mail,
  Stethoscope,
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

export default function DoctorsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t, translationsLoaded } = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchDoctors();
  }, [isAdmin, router]);

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/doctors');
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const specializationOptions = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      if (d.specialization?.trim()) set.add(d.specialization.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [doctors]);

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpec =
      specializationFilter === 'all' ||
      (doctor.specialization?.trim() || '') === specializationFilter;

    return matchesSearch && matchesSpec;
  });

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (!confirm(t('doctors.confirmDelete', { name: doctorName }))) {
      return;
    }

    try {
      const response = await fetch(`/api/doctors?id=${doctorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert(t('doctors.deletedSuccess'));
        fetchDoctors();
      } else {
        const errorData = await response.json();
        alert(
          t('doctors.deleteFailed', {
            error: errorData.error || t('doctors.unknownDeleteError'),
          })
        );
      }
    } catch (error) {
      console.error('Error deleting doctor:', error);
      alert(t('doctors.deleteError'));
    }
  };

  const toggleActionsMenu = (doctorId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setShowActionsMenu(showActionsMenu === doctorId ? null : doctorId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const menuElements = document.querySelectorAll('[data-menu-id]');
      let clickedInsideMenu = false;

      menuElements.forEach((menu) => {
        if (menu.contains(target)) {
          clickedInsideMenu = true;
        }
      });

      if (!clickedInsideMenu) {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  if (!isAdmin) {
    return null;
  }

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('doctors.title')} description={t('doctors.description')} dense>
        <div className="space-y-3">
          {/* Header: search + filters + Add */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
              <div className="flex min-w-[200px] max-w-md flex-1 flex-col gap-0.5">
                <label htmlFor="doctors-search" className="text-xs font-medium text-gray-500">
                  {t('doctors.search')}
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="doctors-search"
                    type="search"
                    placeholder={t('doctors.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex min-w-[200px] max-w-md flex-1 flex-col gap-0.5 sm:max-w-xs">
                <label htmlFor="doctors-specialization" className="text-xs font-medium text-gray-500">
                  {t('doctors.specialization')}
                </label>
                <select
                  id="doctors-specialization"
                  value={specializationFilter}
                  onChange={(e) => setSpecializationFilter(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-300 px-2.5 py-0 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('doctors.filterAllSpecializations')}</option>
                  {specializationOptions.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-[200px] flex-1 flex-col gap-0.5 sm:max-w-xs">
                <span className="text-xs font-medium text-transparent select-none" aria-hidden="true">
                  .
                </span>
                <div className="flex h-9 items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
                  <Filter className="h-4 w-4 shrink-0" />
                  <span>{t('doctors.allDoctors')}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1">
                    {filteredDoctors.length}{' '}
                    {filteredDoctors.length === 1 ? t('doctors.doctor') : t('doctors.doctors')}
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/doctors/new"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('doctors.addDoctor')}</span>
            </Link>
          </div>

          {/* Doctors List */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('doctors.noDoctors')}</h3>
                  <p className="mb-2 text-xs text-gray-500">
                    {searchTerm || specializationFilter !== 'all' ? t('doctors.trySearch') : t('doctors.getStartedAdd')}
                  </p>
                  {!searchTerm && specializationFilter === 'all' && (
                    <Link
                      href="/doctors/new"
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t('doctors.addDoctor')}</span>
                    </Link>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                        {t('doctors.doctorColumn')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:table-cell lg:px-4">
                        {t('doctors.specialization')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:table-cell lg:px-4">
                        {t('doctors.contact')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 xl:table-cell lg:px-4">
                        {t('doctors.created')}
                      </th>
                      <th className="px-3 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                        {t('doctors.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredDoctors.map((doctor) => (
                      <tr
                        key={doctor._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/doctors/${doctor._id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/doctors/${doctor._id}`);
                          }
                        }}
                        className="cursor-pointer hover:bg-blue-50/50"
                      >
                        <td className="px-3 py-2 lg:px-4">
                          <div className="flex items-start gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="truncate text-xs font-medium text-gray-900 sm:text-sm">{doctor.name}</div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 md:hidden">
                                <Stethoscope className="h-3 w-3 shrink-0" />
                                <span className="truncate">{doctor.specialization || '—'}</span>
                              </div>
                              <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-700 sm:text-sm lg:hidden">
                                <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                                {doctor.phone ? (
                                  <span className="truncate">{doctor.phone}</span>
                                ) : (
                                  <span className="text-gray-400">{t('doctors.notAvailable')}</span>
                                )}
                              </div>
                              <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-700 sm:text-sm lg:hidden">
                                <Mail className="h-3 w-3 shrink-0 text-gray-400" />
                                {doctor.email ? (
                                  <span className="truncate" title={doctor.email}>
                                    {doctor.email}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">{t('doctors.notAvailable')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 lg:table-cell lg:px-4">
                          <span className="text-xs text-gray-900 sm:text-sm">{doctor.specialization || t('doctors.notAvailable')}</span>
                        </td>
                        <td className="hidden max-w-[14rem] px-3 py-2 lg:table-cell lg:max-w-xs lg:px-4">
                          <div className="space-y-1">
                            <div className="flex min-w-0 items-start gap-1.5 text-xs text-gray-900">
                              <Mail className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" aria-hidden />
                              {doctor.email ? (
                                <span className="min-w-0 break-all font-medium" title={doctor.email}>
                                  {doctor.email}
                                </span>
                              ) : (
                                <span className="text-gray-400">{t('doctors.notAvailable')}</span>
                              )}
                            </div>
                            <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-900">
                              <Phone className="h-3 w-3 shrink-0 text-gray-400" aria-hidden />
                              {doctor.phone ? (
                                <span className="truncate font-medium" title={doctor.phone}>
                                  {doctor.phone}
                                </span>
                              ) : (
                                <span className="text-gray-400">{t('doctors.notAvailable')}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-xs text-gray-900 sm:text-sm xl:table-cell lg:px-4">
                          {doctor.createdAt ? new Date(doctor.createdAt).toLocaleDateString() : t('doctors.notAvailable')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium sm:text-sm lg:px-4">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/doctors/${doctor._id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                              title={t('doctors.viewDetails')}
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                              <span className="hidden sm:inline">{t('doctors.details')}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/doctors/${doctor._id}/edit`);
                              }}
                              className="rounded-md px-1.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:underline"
                            >
                              {t('doctors.edit')}
                            </button>
                            {doctor.email !== session?.user?.email && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleActionsMenu(doctor._id, e);
                                  }}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  aria-label={t('doctors.actions')}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {showActionsMenu === doctor._id && (
                                  <div
                                    data-menu-id={doctor._id}
                                    className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-gray-200 bg-white py-0.5 shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setShowActionsMenu(null);
                                          handleDeleteDoctor(doctor._id, doctor.name);
                                        }}
                                        className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                                      >
                                        {t('doctors.delete')}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
