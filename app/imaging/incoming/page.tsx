'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Search,
  Filter,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Clock,
  Link as LinkIcon,
  Unlink,
  Eye,
  MonitorPlay,
  Calendar
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';

interface IncomingImage {
  _id: string;
  imageNumber: string;
  deviceCode: string;
  deviceName: string;
  patientName: string;
  patientId: string;
  studyInstanceUID: string;
  modality: string;
  studyDescription: string;
  bodyPartExamined: string;
  matchedStudyNumber: string;
  matchStatus: string;
  matchConfidence: number;
  status: string;
  receivedAt: string;
  requiresAttention: boolean;
}

interface StudyGroup {
  _id: string;
  studyInstanceUID: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  studyDescription: string;
  modality: string;
  imageCount: number;
  seriesCount: number;
  matchStatus: string;
  status: string;
  receivedAt: string;
}

const MODALITY_COLORS: Record<string, string> = {
  CT: 'bg-blue-100 text-blue-800',
  MR: 'bg-purple-100 text-purple-800',
  US: 'bg-green-100 text-green-800',
  DX: 'bg-yellow-100 text-yellow-800',
  CR: 'bg-orange-100 text-orange-800',
  MG: 'bg-pink-100 text-pink-800',
  XA: 'bg-red-100 text-red-800',
  NM: 'bg-indigo-100 text-indigo-800',
  PT: 'bg-cyan-100 text-cyan-800',
};

export default function IncomingImagesPage() {
  const { t, translationsLoaded } = useTranslations();
  const [images, setImages] = useState<IncomingImage[]>([]);
  const [studies, setStudies] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [matchFilter, setMatchFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'images' | 'studies'>('studies');
  const [stats, setStats] = useState({ totalToday: 0, pending: 0, matched: 0, unmatched: 0 });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (matchFilter !== 'all') params.append('matchStatus', matchFilter);
      if (modalityFilter !== 'all') params.append('modality', modalityFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (viewMode === 'studies') params.append('groupBy', 'study');

      const response = await fetch(`/api/imaging/incoming?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (viewMode === 'studies') {
          setStudies(data.studies || []);
        } else {
          setImages(data.images || []);
        }
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching incoming images:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, matchFilter, modalityFilter, searchTerm, viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleApprove = async (imageId: string) => {
    try {
      const response = await fetch(`/api/imaging/incoming/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', applyToStudy: true }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error approving image:', error);
    }
  };

  const handleReject = async (imageId: string) => {
    const reason = prompt(t('imaging.rejectionReasonPrompt'));
    try {
      const response = await fetch(`/api/imaging/incoming/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes: reason }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error rejecting image:', error);
    }
  };

  const getMatchStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      matched: 'bg-green-100 text-green-800',
      unmatched: 'bg-red-100 text-red-800',
      multiple: 'bg-yellow-100 text-yellow-800',
      manual: 'bg-blue-100 text-blue-800',
    };
    return styles[status] || styles.unmatched;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      applied: 'bg-green-100 text-green-800',
    };
    return styles[status] || styles.pending;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  if (!translationsLoaded) {
    return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>;
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff']}>
      <SidebarLayout title={t('imaging.incomingTitle')} description={t('imaging.incomingDescription')} dense>
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  autoRefresh 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? t('imaging.autoRefreshOn') : t('imaging.autoRefreshOff')}
              </button>
              <button
                onClick={fetchData}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('imaging.receivedToday')}</span>
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalToday}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('imaging.pendingReview')}</span>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('imaging.matched')}</span>
                <LinkIcon className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.matched}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('imaging.unmatched')}</span>
                <Unlink className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.unmatched}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('imaging.searchIncomingPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode('studies')}
                    className={`px-3 py-2 text-sm ${
                      viewMode === 'studies' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    {t('imaging.byStudy')}
                  </button>
                  <button
                    onClick={() => setViewMode('images')}
                    className={`px-3 py-2 text-sm ${
                      viewMode === 'images' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    {t('imaging.byImage')}
                  </button>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('imaging.allStatus')}</option>
                  <option value="pending">{t('imaging.statusPending')}</option>
                  <option value="approved">{t('imaging.statusApproved')}</option>
                  <option value="applied">{t('imaging.statusApplied')}</option>
                  <option value="rejected">{t('imaging.statusRejected')}</option>
                </select>
                <select
                  value={matchFilter}
                  onChange={(e) => setMatchFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('imaging.allMatchStatus')}</option>
                  <option value="matched">{t('imaging.matched')}</option>
                  <option value="unmatched">{t('imaging.unmatched')}</option>
                  <option value="multiple">{t('imaging.matchStatusMultiple')}</option>
                </select>
                <select
                  value={modalityFilter}
                  onChange={(e) => setModalityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('imaging.allModalities')}</option>
                  <option value="CT">CT</option>
                  <option value="MR">MRI</option>
                  <option value="US">Ultrasound</option>
                  <option value="DX">Digital X-Ray</option>
                  <option value="CR">Computed Radiography</option>
                  <option value="MG">Mammography</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">{t('imaging.loadingIncoming')}</p>
              </div>
            ) : viewMode === 'studies' ? (
              // Studies view
              studies.length === 0 ? (
                <div className="p-8 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">{t('imaging.noIncomingStudies')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colPatient')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colStudy')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.modality')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colImages')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colMatch')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colReceived')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('imaging.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {studies.map((study) => (
                        <tr key={study._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{study.patientName || t('imaging.unknownPatient')}</p>
                              <p className="text-sm text-gray-500">{study.patientId || '-'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-gray-900">{study.studyDescription || t('imaging.noDescription')}</p>
                              <p className="text-sm text-gray-500">
                                {study.studyDate ? new Date(study.studyDate).toLocaleDateString() : '-'}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${MODALITY_COLORS[study.modality] || 'bg-gray-100 text-gray-800'}`}>
                              {study.modality}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <ImageIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-900">{study.imageCount}</span>
                              <span className="text-xs text-gray-500">
                                ({t('imaging.seriesCount', { count: study.seriesCount })})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getMatchStatusBadge(study.matchStatus)}`}>
                              {study.matchStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(study.status)}`}>
                              {study.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(study.receivedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/imaging/incoming/${study._id}`}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title={t('imaging.viewDetails')}
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              {study.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(study._id)}
                                    className="p-1 text-gray-400 hover:text-green-600"
                                    title={t('imaging.approve')}
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(study._id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                    title={t('imaging.reject')}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Images view
              images.length === 0 ? (
                <div className="p-8 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">{t('imaging.noIncoming')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colImageNumber')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colDevice')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colPatient')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.modality')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colDescription')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('imaging.colMatch')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('imaging.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {images.map((image) => (
                        <tr 
                          key={image._id} 
                          className={`hover:bg-gray-50 ${
                            image.requiresAttention ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <code className="text-sm font-mono text-gray-900">{image.imageNumber}</code>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <MonitorPlay className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-900">{image.deviceName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{image.patientName || t('imaging.unknownPatient')}</p>
                              <p className="text-sm text-gray-500">{image.patientId || '-'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${MODALITY_COLORS[image.modality] || 'bg-gray-100 text-gray-800'}`}>
                              {image.modality}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900 truncate max-w-[200px]">
                              {image.studyDescription || image.bodyPartExamined || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getMatchStatusBadge(image.matchStatus)}`}>
                                {image.matchStatus}
                              </span>
                              {image.matchedStudyNumber && (
                                <span className="text-xs text-gray-500">{image.matchedStudyNumber}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(image.status)}`}>
                              {image.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/imaging/incoming/${image._id}`}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title={t('imaging.viewDetails')}
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              {image.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(image._id)}
                                    className="p-1 text-gray-400 hover:text-green-600"
                                    title={t('imaging.approve')}
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(image._id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                    title={t('imaging.reject')}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
