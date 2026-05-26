'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { 
  UserPlus,
  Plus, 
  Search, 
  Bed,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';

interface Admission {
  _id: string;
  admissionNumber: string;
  patientName: string;
  patientPhone?: string;
  wardName: string;
  bedNumber: string;
  admittingDoctorName: string;
  admissionType: string;
  admissionDate: string;
  expectedDischargeDate?: string;
  status: string;
  priority: string;
  chiefComplaint: string;
}

export default function AdmissionsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    fetchAdmissions();
  }, [filterStatus, filterPriority]);

  const fetchAdmissions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);

      const response = await fetch(`/api/inpatient/admissions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAdmissions(data);
      }
    } catch (error) {
      console.error('Error fetching admissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmissions = admissions.filter(admission => 
    admission.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admission.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admission.wardName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'admitted': 'bg-blue-100 text-blue-800',
      'in-treatment': 'bg-purple-100 text-purple-800',
      'ready-for-discharge': 'bg-green-100 text-green-800',
      'discharged': 'bg-gray-100 text-gray-800',
      'transferred': 'bg-orange-100 text-orange-800',
      'deceased': 'bg-gray-700 text-white',
      'lama': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'normal': 'bg-green-100 text-green-800',
      'urgent': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'admitted': return <Bed className="h-4 w-4" />;
      case 'in-treatment': return <Clock className="h-4 w-4" />;
      case 'ready-for-discharge': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inpatient.admissions')} description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('inpatient.admissions')} description={t('inpatient.admissionsDescription')} dense>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('inpatient.searchAdmissions')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 px-2.5 text-sm border border-gray-300 rounded-md">
                  <option value="">{t('inpatient.allAdmissions')}</option>
                  <option value="active">{t('inpatient.activeAdmissions')}</option>
                  <option value="admitted">{t('inpatient.statusLabels.admitted')}</option>
                  <option value="discharged">{t('inpatient.statusLabels.discharged')}</option>
                </select>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
                  className="h-9 px-2.5 text-sm border border-gray-300 rounded-md">
                  <option value="">{t('inpatient.allPriorities')}</option>
                  <option value="normal">{t('inpatient.priorityLabels.normal')}</option>
                  <option value="urgent">{t('inpatient.priorityLabels.urgent')}</option>
                  <option value="critical">{t('inpatient.priorityLabels.critical')}</option>
                </select>
              </div>
            </div>
            <Link href="/inpatient/admissions/new"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 shrink-0">
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t('inpatient.newAdmission')}</span>
            </Link>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.totalActive')}</p>
                  <p className="text-lg sm:text-xl font-bold">{admissions.filter(a => !['discharged', 'transferred', 'deceased', 'lama'].includes(a.status)).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.readyForDischarge')}</p>
                  <p className="text-lg sm:text-xl font-bold">{admissions.filter(a => a.status === 'ready-for-discharge').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.urgentCases')}</p>
                  <p className="text-lg sm:text-xl font-bold">{admissions.filter(a => a.priority === 'urgent').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t('inpatient.criticalCases')}</p>
                  <p className="text-lg sm:text-xl font-bold">{admissions.filter(a => a.priority === 'critical').length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center">
              <UserPlus className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium mb-1">{t('inpatient.noAdmissions')}</h3>
              <p className="text-sm text-gray-500 mb-3">{t('inpatient.noAdmissionsDescription')}</p>
              <Link href="/inpatient/admissions/new"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                <span>{t('inpatient.newAdmission')}</span>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.patient')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.wardBed')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.doctor')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.admissionDate')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.status')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.priority')}</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAdmissions.map((admission) => (
                      <tr key={admission._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{admission.patientName}</p>
                            <p className="text-xs text-gray-500">{admission.admissionNumber}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{admission.wardName}</p>
                            <p className="text-xs text-gray-500">{t('inpatient.bed')}: {admission.bedNumber}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm">{admission.admittingDoctorName}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="text-sm">{formatDate(admission.admissionDate)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(admission.status)}`}>
                            {getStatusIcon(admission.status)}
                            {t(`inpatient.statusLabels.${admission.status}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(admission.priority)}`}>
                            {t(`inpatient.priorityLabels.${admission.priority}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link href={`/inpatient/admissions/${admission._id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-blue-600 hover:bg-blue-50 rounded-md">
                            <Eye className="h-3.5 w-3.5 shrink-0" />
                            <span>{t('common.view')}</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
