'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TestTube
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

function LabTestsContent() {
  const { t, translationsLoaded } = useTranslations();
  const searchParams = useSearchParams();
  const [labTests, setLabTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Update statusFilter when URL search params change (e.g., when clicking menu items)
  useEffect(() => {
    const statusFromUrl = searchParams.get('status') || 'all';
    if (statusFromUrl !== statusFilter) {
      setStatusFilter(statusFromUrl);
    }
  }, [searchParams]);

  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    fetchLabTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when filters or URL query (e.g. isCritical) change
  }, [statusFilter, priorityFilter, categoryFilter, searchParamsKey]);

  const fetchLabTests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (searchParams.get('isCritical') === 'true') {
        params.append('isCritical', 'true');
      }

      const response = await fetch(`/api/lab?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLabTests(data.labTests || []);
      }
    } catch (error) {
      console.error('Error fetching lab tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchLabTests();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sample-collected':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'sample-collected':
        return <TestTube className="h-4 w-4" />;
      case 'in-progress':
        return <FlaskConical className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      case 'routine':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lab test?')) return;

    try {
      const response = await fetch(`/api/lab/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchLabTests();
      }
    } catch (error) {
      console.error('Error deleting lab test:', error);
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('lab.title')} description="" dense>
          <div className="py-8 text-center sm:py-10">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600 sm:h-9 sm:w-9"></div>
            <p className="mt-2 text-xs text-gray-600 sm:mt-3 sm:text-sm">{t('common.loading')}</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('lab.title')}
        description={t('lab.description')}
        dense
      >
        <div className="space-y-3">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 sm:text-sm">
                {labTests.length} {t('lab.tests').toLowerCase()}
              </span>
            </div>
            <Link
              href="/lab/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t('lab.newTestOrder')}</span>
            </Link>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    placeholder={t('lab.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('lab.allStatuses')}</option>
                  <option value="pending">{t('lab.statusLabels.pending')}</option>
                  <option value="sample-collected">{t('lab.statusLabels.sample-collected')}</option>
                  <option value="in-progress">{t('lab.statusLabels.in-progress')}</option>
                  <option value="completed">{t('lab.statusLabels.completed')}</option>
                  <option value="cancelled">{t('lab.statusLabels.cancelled')}</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('lab.allPriorities')}</option>
                  <option value="routine">{t('lab.priorityLabels.routine')}</option>
                  <option value="urgent">{t('lab.priorityLabels.urgent')}</option>
                  <option value="stat">{t('lab.priorityLabels.stat')}</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 max-w-[10rem] rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500 sm:max-w-none"
                >
                  <option value="all">{t('lab.allCategories')}</option>
                  <option value="hematology">{t('lab.categoryLabels.hematology')}</option>
                  <option value="biochemistry">{t('lab.categoryLabels.biochemistry')}</option>
                  <option value="microbiology">{t('lab.categoryLabels.microbiology')}</option>
                  <option value="immunology">{t('lab.categoryLabels.immunology')}</option>
                  <option value="pathology">{t('lab.categoryLabels.pathology')}</option>
                  <option value="urinalysis">{t('lab.categoryLabels.urinalysis')}</option>
                  <option value="other">{t('lab.categoryLabels.other')}</option>
                </select>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="inline-flex h-9 items-center rounded-md bg-gray-100 px-2.5 text-gray-700 hover:bg-gray-200"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            {loading ? (
              <div className="py-8 text-center sm:py-10">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-2 text-xs text-gray-600 sm:text-sm">{t('common.loading')}</p>
              </div>
            ) : labTests.length === 0 ? (
              <div className="py-8 text-center sm:py-10">
                <FlaskConical className="mx-auto mb-2 h-8 w-8 text-gray-400 sm:mb-3 sm:h-10 sm:w-10" />
                <h3 className="mb-1 text-sm font-medium text-gray-900 sm:text-base">{t('lab.noTests')}</h3>
                <p className="mb-3 text-xs text-gray-600 sm:text-sm">{t('lab.noTestsDesc')}</p>
                <Link
                  href="/lab/new"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('lab.newTestOrder')}</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-600 lg:px-4">
                        {t('lab.patientAndTestNumber')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-600 lg:px-4">
                        {t('lab.testType')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-600 lg:px-4">
                        {t('lab.status')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-600 lg:px-4">
                        {t('lab.priority')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-600 md:table-cell lg:px-4">
                        {t('lab.orderedDate')}
                      </th>
                      <th className="px-3 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-600 lg:px-4">
                        {t('lab.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {labTests.map((test) => (
                      <tr
                        key={test._id}
                        className="cursor-pointer hover:bg-gray-50/80"
                        onClick={() => window.location.href = `/lab/${test._id}`}
                      >
                        <td className="px-3 py-2 lg:px-4">
                          <div className="flex items-start gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                              <FlaskConical className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-gray-900 sm:text-sm">
                                {test.patientName}
                              </div>
                              <div className="mt-0.5 font-mono text-[11px] text-gray-700 sm:text-xs">
                                {test.testNumber}
                              </div>
                              {test.patientEmail && (
                                <div className="max-w-[220px] truncate text-[11px] text-gray-500 sm:max-w-xs sm:text-xs">
                                  {test.patientEmail}
                                </div>
                              )}
                              {test.isCritical && (
                                <div className="mt-0.5 flex items-center text-[10px] text-red-600 sm:text-xs">
                                  <AlertTriangle className="mr-0.5 h-3 w-3 shrink-0" />
                                  Critical
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 lg:px-4">
                          <div className="text-xs text-gray-900 sm:text-sm">{test.testType}</div>
                          <div className="text-[10px] text-gray-500 sm:text-xs">
                            {t(`lab.categoryLabels.${test.testCategory}`)}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 lg:px-4">
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:gap-1 sm:px-2 sm:text-xs ${getStatusColor(
                              test.status
                            )}`}
                          >
                            {getStatusIcon(test.status)}
                            {t(`lab.statusLabels.${test.status}`)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 lg:px-4">
                          <span
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:text-xs ${getPriorityColor(
                              test.priority
                            )}`}
                          >
                            {t(`lab.priorityLabels.${test.priority}`)}
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-xs text-gray-500 md:table-cell lg:px-4 sm:text-sm">
                          {formatDate(test.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right lg:px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/lab/${test._id}`}
                              className="text-blue-600 hover:text-blue-900"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            {test.status !== 'completed' && test.status !== 'cancelled' && (
                              <Link
                                href={`/lab/${test._id}/results`}
                                className="text-green-600 hover:text-green-900"
                                title="Enter Results"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            )}
                            <button
                              onClick={() => handleDelete(test._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function LabTestsPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    }>
      <LabTestsContent />
    </Suspense>
  );
}
