'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  FileText,
  Download,
  Eye,
  Filter,
  Search,
  Calendar,
  User,
  ChevronRight,
  FlaskConical,
  Scan,
  Stethoscope,
  Activity,
  ClipboardCheck
} from 'lucide-react';

interface Report {
  _id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  reportType: 'lab' | 'imaging' | 'diagnostic' | 'treatment' | 'follow-up';
  reportDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'reviewed';
  findings: string;
  diagnosis: string;
  recommendations: string;
  attachments?: string[];
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export default function PatientReportsPage() {
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/patient-portal/reports');
        const data = await res.json();
        setReports(data.reports || []);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'reviewed': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'in-progress': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'lab': return FlaskConical;
      case 'imaging': return Scan;
      case 'diagnostic': return Stethoscope;
      case 'treatment': return Activity;
      case 'follow-up': return ClipboardCheck;
      default: return FileText;
    }
  };

  const getReportColor = (type: string) => {
    switch (type) {
      case 'lab': return 'bg-purple-100 text-purple-600';
      case 'imaging': return 'bg-blue-100 text-blue-600';
      case 'diagnostic': return 'bg-teal-100 text-teal-600';
      case 'treatment': return 'bg-green-100 text-green-600';
      case 'follow-up': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredReports = reports.filter(report => {
    // Filter by type
    if (filter !== 'all' && report.reportType !== filter) return false;
    
    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        report.doctorName.toLowerCase().includes(search) ||
        report.reportType.toLowerCase().includes(search) ||
        report.diagnosis.toLowerCase().includes(search) ||
        report.findings.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
          <p className="mt-2 text-sm text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('patientPortal.reports.title')}</h1>
        <p className="mt-0.5 text-sm text-gray-600">{t('patientPortal.reports.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('patientPortal.reports.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">{t('patientPortal.reports.filter.all')}</option>
          <option value="lab">{t('patientPortal.reports.filter.lab')}</option>
          <option value="imaging">{t('patientPortal.reports.filter.imaging')}</option>
          <option value="diagnostic">{t('patientPortal.reports.filter.diagnostic')}</option>
          <option value="treatment">{t('patientPortal.reports.filter.treatment')}</option>
          <option value="follow-up">{t('patientPortal.reports.filter.followUp')}</option>
        </select>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-3">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => {
            const Icon = getReportIcon(report.reportType);
            return (
              <div
                key={report._id}
                className="cursor-pointer overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                onClick={() => setSelectedReport(report)}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getReportColor(report.reportType)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {report.reportType.replace('-', ' ')} Report
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">{report.doctorName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(report.priority)}`} title={report.priority} />
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                            {report.status.replace('-', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:text-sm">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatDate(report.reportDate)}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs text-gray-600 sm:text-sm">{report.findings}</p>

                      <div className="mt-2">
                        <button className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 sm:text-sm">
                          <Eye className="h-4 w-4" />
                          {t('patientPortal.reports.viewDetails')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-gray-100 bg-white py-8 text-center">
            <FileText className="mx-auto mb-2 h-12 w-12 text-gray-300" />
            <h3 className="text-base font-medium text-gray-900">{t('patientPortal.reports.noReports')}</h3>
            <p className="mt-0.5 text-sm text-gray-500">{t('patientPortal.reports.noReportsDesc')}</p>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white">
            <div className="sticky top-0 border-b border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold capitalize text-gray-900">
                  {selectedReport.reportType.replace('-', ' ')} Report
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-4 p-4">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">{t('patientPortal.reports.doctor')}</p>
                  <p className="font-medium text-gray-900">{selectedReport.doctorName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('patientPortal.reports.date')}</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedReport.reportDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('patientPortal.reports.status')}</p>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.replace('-', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('patientPortal.reports.priority')}</p>
                  <span className="capitalize font-medium text-gray-900">{selectedReport.priority}</span>
                </div>
              </div>

              {/* Findings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('patientPortal.reports.findings')}</h3>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedReport.findings}</p>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <h3 className="mb-1.5 text-xs font-semibold text-gray-900 sm:text-sm">{t('patientPortal.reports.diagnosis')}</h3>
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedReport.diagnosis}</p>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="mb-1.5 text-xs font-semibold text-gray-900 sm:text-sm">{t('patientPortal.reports.recommendations')}</h3>
                <div className="rounded-md border border-green-100 bg-green-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedReport.recommendations}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedReport.notes && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold text-gray-900 sm:text-sm">{t('patientPortal.reports.notes')}</h3>
                  <div className="rounded-md border border-yellow-100 bg-yellow-50 p-3">
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedReport.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
