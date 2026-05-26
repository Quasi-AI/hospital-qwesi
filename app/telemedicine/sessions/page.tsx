'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  Phone,
  MessageCircle,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  PlayCircle,
  X,
  Trash2,
} from 'lucide-react';
import SidebarLayout from '../../components/sidebar-layout';
import { formatCurrencyAmount } from '@/lib/formatCurrency';

interface Session {
  _id: string;
  sessionNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
  };
  doctorId: {
    _id: string;
    name: string;
    specialization?: string;
  };
  consultationType: 'video' | 'audio' | 'chat';
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: string;
  paymentStatus: string;
  consultationFee: number;
  currency: string;
}

function SessionsListContent() {
  const searchParams = useSearchParams();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [page, statusFilter, typeFilter, dateFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('consultationType', typeFilter);
      if (dateFilter) {
        const date = new Date(dateFilter);
        params.append('startDate', date.toISOString());
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        params.append('endDate', endDate.toISOString());
      }

      const res = await fetch(`/api/telemedicine/sessions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch sessions');
      
      const data = await res.json();
      setSessions(data.sessions);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Phone className="w-4 h-4" />;
      case 'chat': return <MessageCircle className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'waiting': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no-show': 'bg-orange-100 text-orange-800',
      'technical-issue': 'bg-purple-100 text-purple-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.round(diff / 60000);
    return `${minutes} min`;
  };

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setDateFilter('');
    setPage(1);
  };

  const handleDeleteClick = (session: Session) => {
    const canDelete = ['scheduled', 'waiting', 'cancelled', 'completed'].includes(session.status);
    if (!canDelete) {
      alert('Only scheduled, waiting, cancelled, or completed sessions can be deleted.');
      return;
    }
    setSessionToDelete(session);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/telemedicine/sessions/${sessionToDelete._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete session.');
        return;
      }
      setSessions(prev => prev.filter(s => s._id !== sessionToDelete._id));
      setTotal(prev => Math.max(0, prev - 1));
      setSessionToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete session.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SidebarLayout title="Telemedicine Sessions" description="Manage all virtual consultations" dense>
      <div className="space-y-4">
        {/* Header + Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex flex-1 flex-col flex-wrap gap-2 sm:flex-row">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="waiting">Waiting</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="chat">Chat</option>
              </select>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-200 px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {(statusFilter || typeFilter || dateFilter) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
          <Link
            href="/telemedicine/sessions/new"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Session
          </Link>
        </div>

        {/* Sessions Table */}
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Session
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Patient
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Doctor
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Scheduled
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Duration
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Fee
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center">
                      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-sm text-gray-500">
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  sessions.map(session => (
                    <tr key={session._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="text-sm font-medium text-gray-900">
                          {session.sessionNumber}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {session.patientId.name}
                          </p>
                          <p className="text-xs text-gray-500">{session.patientId.patientId}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div>
                          <p className="text-sm text-gray-900">Dr. {session.doctorId.name}</p>
                          <p className="text-xs text-gray-500">{session.doctorId.specialization || 'General'}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                          session.consultationType === 'video' ? 'bg-blue-100 text-blue-800' :
                          session.consultationType === 'audio' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {getConsultationIcon(session.consultationType)}
                          {session.consultationType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                        {formatDateTime(session.scheduledStartTime)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                        {getDuration(session.actualStartTime, session.actualEndTime)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${getStatusBadge(session.status)}`}>
                          {session.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">
                        {formatCurrencyAmount(session.consultationFee, session.currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/telemedicine/sessions/${session._id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {(session.status === 'scheduled' || session.status === 'waiting') && (
                            <Link
                              href={`/telemedicine/sessions/${session._id}?start=true`}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                              title="Start Session"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </Link>
                          )}
                          {['scheduled', 'waiting', 'cancelled', 'completed'].includes(session.status) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(session)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete Session"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        {/* Delete session modal */}
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-900">Delete Session</h3>
              <p className="mt-1 text-sm text-gray-600">
                Cancel and remove session <strong>{sessionToDelete.sessionNumber}</strong>? This action cannot be undone.
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Patient: {sessionToDelete.patientId.name} · Dr. {sessionToDelete.doctorId.name}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  disabled={deleting}
                  className="inline-flex h-9 items-center rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Session
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5">
              <p className="text-xs text-gray-500">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} sessions
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

export default function SessionsListPage() {
  return (
    <Suspense fallback={
      <SidebarLayout title="Telemedicine Sessions" description="Manage all virtual consultations" dense>
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      </SidebarLayout>
    }>
      <SessionsListContent />
    </Suspense>
  );
}
