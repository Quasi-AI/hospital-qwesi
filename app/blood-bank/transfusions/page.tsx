'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  Activity,
  Plus,
  Search,
  Eye,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IBloodTransfusion {
  _id: string;
  requestNumber: string;
  patientName: string;
  patientBloodGroup: string;
  requestedBloodGroup: string;
  requestedComponent: string;
  unitsRequested: number;
  urgency: string;
  status: string;
  requestedBy: string;
  requestedByDepartment: string;
  requestedAt: string;
  crossmatchStatus: string;
  hasAdverseReaction: boolean;
}

export default function BloodTransfusionsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [transfusions, setTransfusions] = useState<IBloodTransfusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(() => {
    fetchTransfusions();
  }, [statusFilter, urgencyFilter, activeOnly]);

  const fetchTransfusions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter);
      if (activeOnly) params.append('activeOnly', 'true');
      
      const response = await fetch(`/api/blood-bank/transfusions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch transfusions');
      const data = await response.json();
      setTransfusions(data);
    } catch (error) {
      console.error('Error fetching transfusions:', error);
      toast.error(t('bloodBank.fetchError') || 'Failed to fetch transfusions');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfusions = transfusions.filter(t => {
    const matchesSearch = 
      t.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'cross-matching':
        return 'bg-indigo-100 text-indigo-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'life-threatening':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'emergency':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'urgent':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getBloodGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      'A+': 'bg-red-100 text-red-700',
      'A-': 'bg-red-50 text-red-600',
      'B+': 'bg-blue-100 text-blue-700',
      'B-': 'bg-blue-50 text-blue-600',
      'AB+': 'bg-purple-100 text-purple-700',
      'AB-': 'bg-purple-50 text-purple-600',
      'O+': 'bg-green-100 text-green-700',
      'O-': 'bg-green-50 text-green-600',
    };
    return colors[group] || 'bg-gray-100 text-gray-700';
  };

  const getComponentLabel = (component: string) => {
    const labels: Record<string, string> = {
      'whole-blood': 'Whole Blood',
      'packed-rbc': 'Packed RBC',
      'platelets': 'Platelets',
      'plasma': 'Plasma',
      'cryoprecipitate': 'Cryo',
    };
    return labels[component] || component;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Stats
  const pendingCount = transfusions.filter(t => t.status === 'pending').length;
  const inProgressCount = transfusions.filter(t => ['approved', 'cross-matching', 'ready', 'in-progress'].includes(t.status)).length;
  const criticalCount = transfusions.filter(t => ['life-threatening', 'emergency'].includes(t.urgency) && !['completed', 'cancelled', 'rejected'].includes(t.status)).length;

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.transfusions') || 'Blood Transfusions'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('bloodBank.transfusions') || 'Blood Transfusions'} 
        description={t('bloodBank.transfusionsDescription') || 'Manage transfusion requests and tracking'} dense>
        {/* Stats Cards */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-yellow-600">{t('bloodBank.pendingRequests') || 'Pending Requests'}</p>
                <p className="text-lg font-semibold tabular-nums text-yellow-700">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 shrink-0 text-yellow-500" />
            </div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-purple-600">{t('bloodBank.inProgress') || 'In Progress'}</p>
                <p className="text-lg font-semibold tabular-nums text-purple-700">{inProgressCount}</p>
              </div>
              <Activity className="h-8 w-8 shrink-0 text-purple-500" />
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-red-600">{t('bloodBank.critical') || 'Critical/Emergency'}</p>
                <p className="text-lg font-semibold tabular-nums text-red-700">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 shrink-0 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            <div className="relative w-full flex-1 md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('bloodBank.searchTransfusions') || 'Search by request number, patient...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 py-1.5 pl-9 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span>{t('bloodBank.activeOnly') || 'Active Only'}</span>
              </label>

              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">{t('bloodBank.allUrgencies') || 'All Urgencies'}</option>
                <option value="life-threatening">Life Threatening</option>
                <option value="emergency">Emergency</option>
                <option value="urgent">Urgent</option>
                <option value="routine">Routine</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">{t('bloodBank.allStatuses') || 'All Statuses'}</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="cross-matching">Cross-matching</option>
                <option value="ready">Ready</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>

              <Link
                href="/blood-bank/transfusions/new"
                className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t('bloodBank.newRequest') || 'New Request'}
              </Link>
            </div>
          </div>
        </div>

        {/* Transfusions List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
            </div>
          ) : filteredTransfusions.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white py-10 text-center shadow-sm">
              <Activity className="mx-auto h-9 w-9 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {t('bloodBank.noTransfusions') || 'No transfusion requests found'}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {t('bloodBank.noTransfusionsDesc') || 'Create a new transfusion request to get started.'}
              </p>
              <div className="mt-4">
                <Link
                  href="/blood-bank/transfusions/new"
                  className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('bloodBank.newRequest') || 'New Request'}
                </Link>
              </div>
            </div>
          ) : (
            filteredTransfusions.map((transfusion) => (
              <div
                key={transfusion._id}
                className={`rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md ${
                  ['life-threatening', 'emergency'].includes(transfusion.urgency) 
                    ? 'border-l-4 border-l-red-500' 
                    : ''
                }`}
              >
                <div className="p-3">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-bold ${getBloodGroupColor(transfusion.requestedBloodGroup)}`}>
                        {transfusion.requestedBloodGroup}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-gray-900">{transfusion.requestNumber}</h3>
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${getUrgencyColor(transfusion.urgency)}`}>
                            {transfusion.urgency}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600">
                          <span className="font-medium">{transfusion.patientName}</span>
                          <span className="mx-1.5">•</span>
                          {transfusion.unitsRequested} {t('bloodBank.units') || 'units'} {getComponentLabel(transfusion.requestedComponent)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          Requested by {transfusion.requestedBy} ({transfusion.requestedByDepartment})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 md:items-end">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${getStatusColor(transfusion.status)}`}>
                          {transfusion.status.replace(/-/g, ' ')}
                        </span>
                        {transfusion.hasAdverseReaction && (
                          <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
                            Reaction
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-[11px] text-gray-500">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDateTime(transfusion.requestedAt)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Cross-match:{' '}
                        <span className={`font-medium ${
                          transfusion.crossmatchStatus === 'compatible' ? 'text-green-600' : 
                          transfusion.crossmatchStatus === 'incompatible' ? 'text-red-600' : 
                          'text-yellow-600'
                        }`}>{transfusion.crossmatchStatus}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center md:self-center">
                      <Link
                        href={`/blood-bank/transfusions/${transfusion._id}`}
                        className="inline-flex h-9 items-center rounded-md bg-blue-50 px-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        <Eye className="mr-1.5 h-4 w-4" />
                        {t('common.view') || 'View'}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
