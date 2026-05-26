'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Search,
  Eye,
  Check,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  RefreshCw,
  Cpu,
  TrendingUp
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';

interface DeviceResult {
  _id: string;
  resultNumber: string;
  deviceCode: string;
  deviceName: string;
  sampleId: string;
  matchedTestNumber: string | null;
  matchStatus: string;
  matchConfidence: number;
  status: string;
  receivedAt: string;
  hasCriticalValues: boolean;
  requiresAttention: boolean;
  results: {
    parameterCode: string;
    parameterName: string;
    value: string;
    unit: string;
    flag: string;
  }[];
}

export default function IncomingResultsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [results, setResults] = useState<DeviceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [matchFilter, setMatchFilter] = useState('all');
  const [criticalFilter, setCriticalFilter] = useState(false);
  const [stats, setStats] = useState({
    totalToday: 0,
    pending: 0,
    critical: 0,
    matched: 0,
    unmatched: 0,
  });
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchResults = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (matchFilter !== 'all') params.append('matchStatus', matchFilter);
      if (criticalFilter) params.append('hasCritical', 'true');
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/lab/device-results?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setStats(data.stats || {
          totalToday: 0,
          pending: 0,
          critical: 0,
          matched: 0,
          unmatched: 0,
        });
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, matchFilter, criticalFilter, searchTerm]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchResults();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchResults]);

  const handleSearch = () => {
    setLoading(true);
    fetchResults();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleQuickApprove = async (resultId: string) => {
    try {
      const response = await fetch(`/api/lab/device-results/${resultId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        fetchResults();
      } else {
        const error = await response.json();
        alert(error.error || t('lab.incoming.failedApprove'));
      }
    } catch (error) {
      console.error('Error approving result:', error);
    }
  };

  const handleQuickReject = async (resultId: string) => {
    if (!confirm(t('lab.incoming.rejectConfirm'))) return;
    
    try {
      const response = await fetch(`/api/lab/device-results/${resultId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: 'Quick reject' }),
      });

      if (response.ok) {
        fetchResults();
      }
    } catch (error) {
      console.error('Error rejecting result:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            {t('lab.incoming.pending')}
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Check className="h-3 w-3" />
            {t('lab.incoming.approved')}
          </span>
        );
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            {t('lab.incoming.applied')}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            {t('lab.incoming.rejected')}
          </span>
        );
      default:
        return null;
    }
  };

  const getMatchBadge = (matchStatus: string) => {
    switch (matchStatus) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <LinkIcon className="h-3 w-3" />
            {t('lab.incoming.matched')}
          </span>
        );
      case 'multiple':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="h-3 w-3" />
            {t('lab.incoming.matchBadgeMultiple')}
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Check className="h-3 w-3" />
            {t('lab.incoming.matchBadgeManual')}
          </span>
        );
      case 'unmatched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <X className="h-3 w-3" />
            {t('lab.incoming.unmatched')}
          </span>
        );
      default:
        return null;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return t('lab.incoming.dateToday');
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return t('lab.incoming.dateYesterday');
    }
    return date.toLocaleDateString();
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('lab.incoming.title')} description={t('common.loading')} dense>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('lab.incoming.title')}
        description={t('lab.incoming.description')}
        dense
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.totalToday}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.incoming.dateToday')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.pending}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.incoming.pendingReview')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.critical}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.incoming.criticalValues')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-100">
                  <LinkIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.matched}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.incoming.matched')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-100">
                  <X className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{stats.unmatched}</p>
                  <p className="text-[10px] text-gray-500 sm:text-xs">{t('lab.incoming.unmatched')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch justify-between gap-2 md:flex-row md:items-center">
            <div className="flex flex-1 flex-col gap-2 md:flex-row md:flex-wrap">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder={t('lab.incoming.searchIncomingPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('lab.incoming.allStatus')}</option>
                <option value="pending">{t('lab.incoming.pending')}</option>
                <option value="approved">{t('lab.incoming.approved')}</option>
                <option value="applied">{t('lab.incoming.applied')}</option>
                <option value="rejected">{t('lab.incoming.rejected')}</option>
              </select>

              <select
                value={matchFilter}
                onChange={(e) => setMatchFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('lab.incoming.allMatches')}</option>
                <option value="matched">{t('lab.incoming.matched')}</option>
                <option value="unmatched">{t('lab.incoming.unmatched')}</option>
                <option value="multiple">{t('lab.incoming.multipleMatches')}</option>
              </select>

              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-2 text-xs hover:bg-gray-50 sm:text-sm">
                <input
                  type="checkbox"
                  checked={criticalFilter}
                  onChange={(e) => setCriticalFilter(e.target.checked)}
                  className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">{t('lab.incoming.criticalOnly')}</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700 sm:text-sm">{t('lab.incoming.autoRefresh')}</span>
              </label>
              
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  fetchResults();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 px-2.5 text-xs text-gray-700 hover:bg-gray-50 sm:text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">{t('lab.incoming.refresh')}</span>
              </button>
            </div>
          </div>

          {/* Last Refresh Time */}
          <p className="text-xs text-gray-500 sm:text-sm">
            {t('lab.incoming.lastUpdated')}: {formatTime(lastRefresh.toISOString())}
            {autoRefresh && ` ${t('lab.incoming.autoRefreshEvery10s')}`}
          </p>

          {/* Results List */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            {loading && results.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-2 text-xs text-gray-600 sm:text-sm">{t('lab.incoming.loadingResults')}</p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="mx-auto mb-2 h-8 w-8 text-gray-400 sm:h-10 sm:w-10" />
                <h3 className="mb-1 text-sm font-medium text-gray-900 sm:text-base">{t('lab.incoming.noResults')}</h3>
                <p className="text-xs text-gray-600 sm:text-sm">
                  {statusFilter === 'pending' 
                    ? t('lab.incoming.noResultsPending')
                    : t('lab.incoming.noResultsFiltered')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.incoming.colResultSample')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.incoming.device')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.incoming.matchedTest')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('common.status')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.results')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.incoming.colTime')}
                      </th>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 lg:px-4">
                        {t('lab.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((result) => (
                      <tr key={result._id} className={`hover:bg-gray-50 ${result.hasCriticalValues ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 lg:px-4">
                          <div>
                            <p className="font-medium text-gray-900">{result.resultNumber}</p>
                            <p className="text-sm text-gray-500">{t('lab.incoming.sampleLabeled', { sampleId: result.sampleId })}</p>
                            {result.hasCriticalValues && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3" />
                                {t('lab.incoming.criticalShort')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{result.deviceCode}</p>
                              <p className="text-xs text-gray-500">{result.deviceName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          <div>
                            {getMatchBadge(result.matchStatus)}
                            {result.matchedTestNumber && (
                              <p className="text-sm text-gray-900 mt-1">{result.matchedTestNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          {getStatusBadge(result.status)}
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{t('lab.incoming.parametersCount', { count: result.results.length })}</p>
                            <div className="flex gap-1 mt-1">
                              {result.results.slice(0, 3).map((r, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                                    r.flag === 'critical-low' || r.flag === 'critical-high'
                                      ? 'bg-red-100 text-red-800'
                                      : r.flag === 'low' || r.flag === 'high'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {r.parameterCode}
                                </span>
                              ))}
                              {result.results.length > 3 && (
                                <span className="text-xs text-gray-400">+{result.results.length - 3}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{formatTime(result.receivedAt)}</p>
                            <p className="text-gray-500">{formatDate(result.receivedAt)}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2 lg:px-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/lab/incoming/${result._id}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title={t('lab.incoming.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            {result.status === 'pending' && result.matchStatus === 'matched' && (
                              <button
                                onClick={() => handleQuickApprove(result._id)}
                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                title={t('lab.incoming.quickApprove')}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            {result.status === 'pending' && (
                              <button
                                onClick={() => handleQuickReject(result._id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title={t('lab.incoming.reject')}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
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
