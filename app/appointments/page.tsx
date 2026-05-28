'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter,
  Clock,
  Users,
  MapPin,
  Globe,
  MoreVertical,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

export default function AppointmentsPage() {
  const { t } = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalAppointment, setDeleteModalAppointment] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch('/api/appointments');
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
  }, []);

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.patientId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || appointment.status?.toLowerCase() === filterStatus.toLowerCase();
    const matchesDate = filterDate === 'all' || appointment.appointmentDate === filterDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'consultation':
        return 'bg-blue-100 text-blue-800';
      case 'follow-up':
        return 'bg-purple-100 text-purple-800';
      case 'home-nurse-visit':
        return 'bg-teal-100 text-teal-800';
      case 'examination':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewAppointment = (appointment: any) => {
    window.location.href = `/appointments/${appointment._id}`;
  };

  const handleEditAppointment = (appointment: any) => {
    window.location.href = `/appointments/${appointment._id}/edit`;
  };

  const handleRescheduleAppointment = (appointment: any) => {
    window.location.href = `/appointments/${appointment._id}/reschedule`;
  };

  const handleCancelAppointment = async (appointment: any) => {
    if (confirm(`Are you sure you want to cancel the appointment for ${appointment.patientName}?`)) {
      try {
        const response = await fetch(`/api/appointments/${appointment._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...appointment,
            status: 'cancelled'
          }),
        });

        if (response.ok) {
          // Update the local state
          setAppointments(prev => 
            prev.map(apt => 
              apt._id === appointment._id 
                ? { ...apt, status: 'cancelled' }
                : apt
            )
          );
          alert(`Appointment for ${appointment.patientName} cancelled successfully`);
        } else {
          alert('Failed to cancel appointment. Please try again.');
        }
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('An error occurred while cancelling the appointment.');
      }
    }
  };

  const handleDeleteClick = (appointment: any) => {
    requestAnimationFrame(() => setShowActionsMenu(null));
    setDeleteModalAppointment(appointment);
  };

  const doDeleteAppointment = async (appointment: any) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/appointments/${appointment._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAppointments(prev => prev.filter(apt => apt._id !== appointment._id));
        setDeleteModalAppointment(null);
        setToast({ message: `Appointment for ${appointment.patientName} deleted successfully`, type: 'success' });
      } else {
        setToast({ message: 'Failed to delete appointment. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      setToast({ message: 'An error occurred while deleting the appointment.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteConfirmModal = () => {
    if (deleteModalAppointment) {
      doDeleteAppointment(deleteModalAppointment);
    }
  };

  const toggleActionsMenu = (appointmentId: string) => {
    setShowActionsMenu(showActionsMenu === appointmentId ? null : appointmentId);
  };

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Close actions menu when clicking outside any menu or its trigger
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-appointment-actions]')) return;
      setShowActionsMenu(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close menu when pressing Escape key
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
      <SidebarLayout
        title={t('appointments.title')}
        description={t('appointments.description')}
        dense
      >
        <div className="space-y-3">
          {/* Header: search + filters + Add */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-[200px] max-w-md flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder={t('appointments.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('appointments.allStatus')}</option>
                  <option value="confirmed">{t('appointments.upcoming')}</option>
                  <option value="pending">{t('appointments.upcoming')}</option>
                  <option value="cancelled">{t('appointments.cancelled')}</option>
                </select>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('appointments.allDates')}</option>
                  <option value="2024-02-20">{t('appointments.today')} (Feb 20)</option>
                  <option value="2024-02-21">Tomorrow (Feb 21)</option>
                </select>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 sm:text-sm">
                  {filteredAppointments.length} {t('appointments.title').toLowerCase()}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/appointments/slots"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span>{t('appointments.slotAvailability')}</span>
              </Link>
              <Link
                href="/appointments/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>{t('appointments.addNew')}</span>
              </Link>
            </div>
          </div>

          {/* Appointments List */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-6 text-center">
                <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('appointments.noAppointments')}</h3>
                <p className="mb-2 text-xs text-gray-500 sm:text-sm">
                  {searchTerm || filterStatus !== 'all' || filterDate !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : t('appointments.noAppointmentsDesc')}
                </p>
                {!searchTerm && filterStatus === 'all' && filterDate === 'all' && (
                  <Link
                    href="/appointments/new"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('appointments.addNew')}</span>
                  </Link>
                )}
              </div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                    {t('appointments.patientDoctor')}
                  </th>
                  <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                    {t('appointments.dateTime')}
                  </th>
                  <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 md:table-cell lg:px-4">
                    {t('appointments.type')}
                  </th>
                  <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                    {t('appointments.status')}
                  </th>
                  <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:table-cell lg:px-4">
                    Location
                  </th>
                  <th className="px-3 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                    {t('appointments.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment._id || appointment.id} className="hover:bg-blue-50/50">
                    <td className="px-3 py-2 lg:px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-xs font-medium text-gray-900 sm:text-sm">{appointment.patientName}</span>
                            {appointment.source === 'website' ? (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800 sm:text-xs">
                                <Globe className="h-3 w-3 shrink-0" aria-hidden />
                                {t('appointments.fromWebsite')}
                              </span>
                            ) : null}
                          </div>
                          <div className="truncate text-[11px] text-gray-500">ID: {appointment.patientId || 'N/A'}</div>
                          <div className="truncate text-xs font-medium text-gray-700 sm:text-sm">
                            {appointment.doctorName || 'No doctor assigned'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 lg:px-4">
                      <div className="text-xs text-gray-900 sm:text-sm">{new Date(appointment.appointmentDate).toLocaleDateString()}</div>
                      <div className="flex items-center text-xs text-gray-700 sm:text-sm">
                        <Clock className="mr-1 h-3 w-3 shrink-0" />
                        {appointment.appointmentTime}
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 md:table-cell lg:px-4">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:text-xs ${getTypeColor(appointment.appointmentType)}`}>
                        {appointment.appointmentType}
                      </span>
                    </td>
                    <td className="px-3 py-2 lg:px-4">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:text-xs ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell lg:px-4 lg:py-2">
                      <div className="flex min-w-0 items-center text-xs text-gray-900 sm:text-sm">
                        <MapPin className="mr-1 h-3 w-3 shrink-0" />
                        <span className="truncate">{appointment.location}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs sm:text-sm lg:px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          type="button"
                          onClick={() => handleViewAppointment(appointment)}
                          className="rounded-md px-1.5 py-1 font-medium text-blue-600 hover:bg-blue-50"
                        >
                          {t('appointments.view')}
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleEditAppointment(appointment)}
                          className="rounded-md px-1.5 py-1 font-medium text-green-600 hover:bg-green-50"
                        >
                          {t('appointments.edit')}
                        </button>
                        <div className="relative" data-appointment-actions>
                        <button
                          type="button"
                          onClick={() => toggleActionsMenu(appointment._id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                          {showActionsMenu === appointment._id && (
                            <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg" data-appointment-actions>
                              <div className="py-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewAppointment(appointment)}
                                  className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  {t('appointments.viewDetails')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditAppointment(appointment)}
                                  className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  {t('appointments.editAppointment')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRescheduleAppointment(appointment)}
                                  className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  {t('appointments.reschedule')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelAppointment(appointment)}
                                  className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                                >
                                  {t('appointments.cancelAppointment')}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(appointment);
                                  }}
                                  className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                                >
                                  Delete Appointment
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
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

        {/* Delete appointment modal */}
        {deleteModalAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <h3 className="mb-1 text-sm font-semibold text-gray-900">Delete Appointment</h3>
              {deleteModalAppointment.telemedicineSessionId ? (
                <p className="mb-2 text-xs text-gray-600 sm:text-sm">
                  This appointment has a linked video consultation session. Deleting this appointment will also permanently delete the linked telemedicine session.
                </p>
              ) : null}
              <p className="mb-4 text-xs text-gray-700 sm:text-sm">
                Are you sure you want to permanently delete the appointment for <strong>{deleteModalAppointment.patientName}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalAppointment(null)}
                  disabled={deleting}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirmModal}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Deleting...
                    </>
                  ) : deleteModalAppointment.telemedicineSessionId ? (
                    'Delete Appointment & Video Session'
                  ) : (
                    'Delete Appointment'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 z-[60] flex max-w-sm items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
            role="alert"
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <p className="text-xs font-medium sm:text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-current opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
