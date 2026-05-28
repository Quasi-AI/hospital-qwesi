'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

export default function PatientsPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients');
        if (response.ok) {
          const data = await response.json();
          setPatients(data);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handleViewPatient = (patient: any) => {
    setShowActionsMenu(null);
    router.push(`/patients/${patient._id}`);
  };

  const handleEditPatient = (patient: any) => {
    setShowActionsMenu(null);
    router.push(`/patients/${patient._id}/edit`);
  };

  const handleDeletePatient = async (patient: any) => {
    setShowActionsMenu(null);
    if (confirm(`${t('common.confirm')} ${t('patients.deletePatient')} ${patient.name}?`)) {
      try {
        const response = await fetch(`/api/patients/${patient._id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setPatients(patients.filter((p) => p._id !== patient._id));
          alert(`${t('patients.patient')} ${patient.name} ${t('common.success')}`);
        } else {
          const error = await response.json();
          alert(error.error || t('common.error'));
        }
      } catch (error) {
        console.error('Error deleting patient:', error);
        alert(t('common.error'));
      }
    }
  };

  const toggleActionsMenu = (patientId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setShowActionsMenu(showActionsMenu === patientId ? null : patientId);
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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('patients.title')} description={t('patients.description')} dense>
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-[200px] max-w-md flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder={t('patients.searchPatients')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
              </div>
              <div className="flex h-9 items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
                <Filter className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{t('patients.allPatients')}</span>
                <span className="rounded-full bg-gray-100 px-2 py-1">
                  {t('patients.patientsCount', { count: filteredPatients.length })}
                </span>
              </div>
            </div>
            <Link
              href="/patients/new"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('patients.addNewPatient')}</span>
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('patients.noPatientsFound')}</h3>
                  <p className="mb-2 text-xs text-gray-500">
                    {searchTerm ? t('patients.tryAdjustingSearch') : t('patients.getStartedAdding')}
                  </p>
                  {!searchTerm && (
                    <Link
                      href="/patients/new"
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t('patients.addNewPatient')}</span>
                    </Link>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                        {t('patients.patient')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 md:table-cell lg:px-4">
                        {t('patients.contact')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                        {t('patients.status')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:table-cell lg:px-4">
                        {t('patients.registrationDate')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 xl:table-cell lg:px-4">
                        {t('patients.assignedDoctor')}
                      </th>
                      <th className="px-3 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                        {t('patients.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredPatients.map((patient, index) => {
                      const openMenuUp = filteredPatients.length - index <= 2;
                      return (
                      <tr
                        key={patient._id}
                        className="cursor-pointer hover:bg-blue-50/50"
                        onClick={() => handleViewPatient(patient)}
                      >
                        <td className="px-3 py-2 lg:px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium text-gray-900 sm:text-sm">{patient.name}</div>
                              <div className="truncate text-[11px] text-gray-500 sm:text-xs">
                                ID: {patient.patientId || patient._id}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-600 md:hidden">
                                {patient.email && (
                                  <span className="flex min-w-0 items-center gap-0.5">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{patient.email}</span>
                                  </span>
                                )}
                                {patient.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="h-3 w-3 shrink-0" />
                                    {patient.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 md:table-cell lg:px-4">
                          <div className="text-xs text-gray-900 sm:text-sm">{patient.email}</div>
                          <div className="text-xs text-gray-600">{patient.phone}</div>
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          <span
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:text-xs ${getStatusColor('Active')}`}
                          >
                            {t('profile.active')}
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-xs text-gray-900 lg:table-cell lg:px-4">
                          {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="hidden max-w-[140px] truncate px-3 py-2 text-xs text-gray-900 xl:table-cell lg:px-4">
                          {patient.assignedDoctor || t('common.no')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-xs sm:text-sm lg:px-4">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPatient(patient);
                              }}
                              className="rounded-md px-1.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                              {t('common.view')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPatient(patient);
                              }}
                              className="rounded-md px-1.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                            >
                              {t('common.edit')}
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleActionsMenu(patient._id, e);
                                }}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                aria-label={t('patients.actions')}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {showActionsMenu === patient._id && (
                                <div
                                  data-menu-id={patient._id}
                                  className={`absolute right-0 z-50 w-44 rounded-md border border-gray-200 bg-white py-0.5 shadow-lg ${
                                    openMenuUp ? 'bottom-full mb-1' : 'mt-1'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowActionsMenu(null);
                                      handleViewPatient(patient);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                                  >
                                    {t('patients.viewDetails')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowActionsMenu(null);
                                      handleEditPatient(patient);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                                  >
                                    {t('patients.editPatient')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowActionsMenu(null);
                                      handleDeletePatient(patient);
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                                  >
                                    {t('patients.deletePatient')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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
