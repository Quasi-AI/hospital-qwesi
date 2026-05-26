'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';
import { 
  Siren, 
  Plus, 
  Search, 
  Eye, 
  Clock,
  User,
  AlertTriangle,
  AlertCircle,
  Timer,
  Ambulance,
  HeartPulse,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IEmergencyCase {
  _id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  triageLevel: string;
  chiefComplaint: string;
  arrivalMode: string;
  arrivalTime: string;
  status: string;
  attendingDoctorName?: string;
  totalWaitingTime?: number;
  createdAt: string;
}

export default function EmergencyPage() {
  const { t, translationsLoaded } = useTranslations();
  const [cases, setCases] = useState<IEmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [triageFilter, setTriageFilter] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    fetchCases();
  }, [showActiveOnly]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showActiveOnly) params.append('activeOnly', 'true');
      
      const response = await fetch(`/api/emergency?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch cases');
      const data = await response.json();
      setCases(data);
    } catch (error) {
      console.error('Error fetching emergency cases:', error);
      toast.error(t('emergency.fetchError') || 'Failed to fetch emergency cases');
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesTriage = triageFilter === 'all' || c.triageLevel === triageFilter;
    
    return matchesSearch && matchesStatus && matchesTriage;
  });

  const getTriageColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'urgent':
        return 'bg-orange-500 text-white';
      case 'moderate':
        return 'bg-yellow-500 text-white';
      case 'minor':
        return 'bg-green-500 text-white';
      case 'non-urgent':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTriageBorderColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'border-l-red-600';
      case 'urgent':
        return 'border-l-orange-500';
      case 'moderate':
        return 'border-l-yellow-500';
      case 'minor':
        return 'border-l-green-500';
      case 'non-urgent':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-triage':
        return 'bg-blue-100 text-blue-800';
      case 'in-treatment':
        return 'bg-purple-100 text-purple-800';
      case 'under-observation':
        return 'bg-indigo-100 text-indigo-800';
      case 'ready-for-discharge':
        return 'bg-green-100 text-green-800';
      case 'discharged':
        return 'bg-gray-100 text-gray-800';
      case 'admitted':
        return 'bg-blue-100 text-blue-800';
      case 'transferred':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTriageLabel = (level: string) => {
    return t(`emergency.triageLabels.${level}`) || level.charAt(0).toUpperCase() + level.slice(1);
  };

  const getStatusLabel = (status: string) => {
    return t(`emergency.statusLabels.${status}`) || status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getWaitingTime = (arrivalTime: string) => {
    const arrival = new Date(arrivalTime);
    const now = new Date();
    const diffMs = now.getTime() - arrival.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const getArrivalModeIcon = (mode: string) => {
    switch (mode) {
      case 'ambulance':
        return <Ambulance className="h-4 w-4 text-red-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  // Stats
  const criticalCount = cases.filter(c => c.triageLevel === 'critical').length;
  const urgentCount = cases.filter(c => c.triageLevel === 'urgent').length;
  const waitingCount = cases.filter(c => c.status === 'waiting').length;
  const inTreatmentCount = cases.filter(c => c.status === 'in-treatment').length;

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('emergency.title') || 'Emergency Department'}
          description={t('emergency.description') || 'Manage emergency cases and triage'}
          dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('emergency.title') || 'Emergency Department'} 
        description={t('emergency.description') || 'Manage emergency cases and triage'} dense>
        <div className="space-y-3">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600">{t('emergency.critical') || 'Critical'}</p>
                <p className="text-2xl font-bold text-red-700">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600">{t('emergency.urgent') || 'Urgent'}</p>
                <p className="text-2xl font-bold text-orange-700">{urgentCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-600">{t('emergency.waiting') || 'Waiting'}</p>
                <p className="text-2xl font-bold text-yellow-700">{waitingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600">{t('emergency.inTreatment') || 'In Treatment'}</p>
                <p className="text-2xl font-bold text-purple-700">{inTreatmentCount}</p>
              </div>
              <HeartPulse className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Triage Legend */}
        <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-700">{t('emergency.triageLegend') || 'Triage Levels'}:</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                {t('emergency.triageLabels.critical') || 'Critical'}
              </span>
              <span className="rounded-md bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">
                {t('emergency.triageLabels.urgent') || 'Urgent'}
              </span>
              <span className="rounded-md bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white">
                {t('emergency.triageLabels.moderate') || 'Moderate'}
              </span>
              <span className="rounded-md bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                {t('emergency.triageLabels.minor') || 'Minor'}
              </span>
              <span className="rounded-md bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
                {t('emergency.triageLabels.non-urgent') || 'Non-Urgent'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative w-full flex-1 md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('emergency.searchPlaceholder') || 'Search by patient name, case number...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span>{t('emergency.activeOnly') || 'Active Cases Only'}</span>
              </label>

              <select
                value={triageFilter}
                onChange={(e) => setTriageFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t('emergency.allTriage') || 'All Triage'}</option>
                <option value="critical">{t('emergency.triageLabels.critical') || 'Critical'}</option>
                <option value="urgent">{t('emergency.triageLabels.urgent') || 'Urgent'}</option>
                <option value="moderate">{t('emergency.triageLabels.moderate') || 'Moderate'}</option>
                <option value="minor">{t('emergency.triageLabels.minor') || 'Minor'}</option>
                <option value="non-urgent">{t('emergency.triageLabels.non-urgent') || 'Non-Urgent'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t('emergency.allStatuses') || 'All Statuses'}</option>
                <option value="waiting">{t('emergency.statusLabels.waiting') || 'Waiting'}</option>
                <option value="in-triage">{t('emergency.statusLabels.in-triage') || 'In Triage'}</option>
                <option value="in-treatment">{t('emergency.statusLabels.in-treatment') || 'In Treatment'}</option>
                <option value="under-observation">{t('emergency.statusLabels.under-observation') || 'Under Observation'}</option>
                <option value="ready-for-discharge">{t('emergency.statusLabels.ready-for-discharge') || 'Ready for Discharge'}</option>
              </select>

              <Link
                href="/emergency/new"
                className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t('emergency.newCase') || 'New Case'}
              </Link>
            </div>
          </div>
        </div>

        {/* Cases List - Card View */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-red-600" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white py-8 text-center shadow-sm">
              <Siren className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('emergency.noCases') || 'No emergency cases'}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {t('emergency.noCasesDesc') || 'No active emergency cases at this time.'}
              </p>
              <div className="mt-4">
                <Link
                  href="/emergency/new"
                  className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('emergency.newCase') || 'New Case'}
                </Link>
              </div>
            </div>
          ) : (
            filteredCases.map((emergencyCase) => (
              <div
                key={emergencyCase._id}
                className={`rounded-lg border border-gray-100 bg-white border-l-4 shadow-sm ${getTriageBorderColor(emergencyCase.triageLevel)} transition-shadow hover:shadow-md`}
              >
                <div className="p-3">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    {/* Patient Info */}
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getTriageColor(emergencyCase.triageLevel)}`}>
                        <span className="text-sm font-bold">
                          {emergencyCase.triageLevel === 'critical' ? '1' : 
                           emergencyCase.triageLevel === 'urgent' ? '2' : 
                           emergencyCase.triageLevel === 'moderate' ? '3' : 
                           emergencyCase.triageLevel === 'minor' ? '4' : '5'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-gray-900">{emergencyCase.patientName}</h3>
                          {getArrivalModeIcon(emergencyCase.arrivalMode)}
                        </div>
                        <p className="text-xs text-gray-500">{emergencyCase.caseNumber}</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {emergencyCase.patientAge && `${emergencyCase.patientAge} yrs`}
                          {emergencyCase.patientGender && ` • ${emergencyCase.patientGender}`}
                        </p>
                      </div>
                    </div>

                    {/* Chief Complaint */}
                    <div className="min-w-0 flex-1 md:px-3">
                      <p className="text-xs text-gray-500">{t('emergency.chiefComplaint') || 'Chief Complaint'}</p>
                      <p className="text-sm font-medium text-gray-900">{emergencyCase.chiefComplaint}</p>
                    </div>

                    {/* Status & Time */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getTriageColor(emergencyCase.triageLevel)}`}>
                          {getTriageLabel(emergencyCase.triageLevel)}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(emergencyCase.status)}`}>
                          {getStatusLabel(emergencyCase.status)}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Timer className="mr-1 h-3.5 w-3.5" />
                        <span>{t('emergency.waitingFor') || 'Waiting'}: {getWaitingTime(emergencyCase.arrivalTime)}</span>
                      </div>
                      {emergencyCase.attendingDoctorName && (
                        <p className="text-xs text-gray-500">
                          {t('emergency.doctor') || 'Dr.'}: {emergencyCase.attendingDoctorName}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center md:shrink-0">
                      <Link
                        href={`/emergency/${emergencyCase._id}`}
                        className="inline-flex h-9 items-center rounded-md bg-red-50 px-3 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        {t('common.view') || 'View'}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
