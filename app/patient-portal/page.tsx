'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslations } from '../hooks/useTranslations';
import { 
  Calendar,
  FileText,
  Pill,
  Clock,
  ArrowRight,
  Activity,
  Heart,
  Bot,
  Send
} from 'lucide-react';

interface DashboardStats {
  upcomingAppointments: number;
  totalReports: number;
  activePrescriptions: number;
  pendingResults: number;
}

interface Appointment {
  _id: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status: string;
}

interface Report {
  _id: string;
  reportType: string;
  reportDate: string;
  status: string;
  doctorName: string;
}

interface AssistantMessage {
  role: 'user' | 'assistant';
  text: string;
  doctors?: Array<{
    id: string;
    name: string;
    specialization: string;
    reason: string;
  }>;
}

export default function PatientPortalDashboard() {
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [stats, setStats] = useState<DashboardStats>({
    upcomingAppointments: 0,
    totalReports: 0,
    activePrescriptions: 0,
    pendingResults: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      text: 'Tell me what symptom or health concern you want help with, and I can suggest safe next steps and the most relevant approved doctor.',
    },
  ]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user?.email) return;
      
      try {
        // Fetch appointments
        const appointmentsRes = await fetch(`/api/patient-portal/appointments`);
        const appointmentsData = await appointmentsRes.json();
        
        // Fetch reports
        const reportsRes = await fetch(`/api/patient-portal/reports`);
        const reportsData = await reportsRes.json();

        const appointments = appointmentsData.appointments || [];
        const reports = reportsData.reports || [];

        // Calculate stats
        const now = new Date();
        const upcomingAppointments = appointments.filter((apt: Appointment) => 
          new Date(apt.appointmentDate) >= now && apt.status !== 'cancelled'
        ).length;

        const pendingResults = reports.filter((r: Report) => 
          r.status === 'pending' || r.status === 'in-progress'
        ).length;

        setStats({
          upcomingAppointments,
          totalReports: reports.length,
          activePrescriptions: reports.filter((r: Report) => r.reportType === 'treatment').length,
          pendingResults
        });

        // Get recent items
        setRecentAppointments(appointments.slice(0, 3));
        setRecentReports(reports.slice(0, 3));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
      case 'reviewed':
        return 'bg-green-100 text-green-700';
      case 'scheduled':
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAppointmentTypeColor = (type: string) => {
    switch (type) {
      case 'consultation': return 'bg-blue-500';
      case 'follow-up': case 'followUp': return 'bg-purple-500';
      case 'home-nurse-visit': return 'bg-teal-500';
      case 'checkup': return 'bg-green-500';
      case 'emergency': return 'bg-red-500';
      case 'surgery': return 'bg-orange-500';
      case 'therapy': return 'bg-teal-500';
      default: return 'bg-gray-500';
    }
  };

  const sendAssistantMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = assistantInput.trim();
    if (!text || assistantLoading) return;

    setAssistantInput('');
    setAssistantMessages((current) => [...current, { role: 'user', text }]);
    setAssistantLoading(true);
    try {
      const response = await fetch('/api/patient-portal/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json().catch(() => ({}));
      setAssistantMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: data.reply || data.error || 'I could not answer that right now.',
          doctors: data.recommendedDoctors || [],
        },
      ]);
    } catch {
      setAssistantMessages((current) => [
        ...current,
        { role: 'assistant', text: 'I could not answer that right now. Please try again.' },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

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
      {/* Welcome Header */}
      <div className="rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 p-4 text-white shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="mb-1 text-xl font-bold">
              {t('patientPortal.dashboard.welcome')}, {session?.user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-sm text-teal-100">
              {t('patientPortal.dashboard.subtitle')}
            </p>
          </div>
          <div className="hidden md:block shrink-0">
            <Heart className="h-12 w-12 text-white/20" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-teal-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Bot className="h-5 w-5 text-teal-600" />
            Health assistant
          </h2>
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
            Health only
          </span>
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto p-4">
          {assistantMessages.map((item, index) => (
            <div key={index} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  item.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'border border-gray-100 bg-gray-50 text-gray-800'
                }`}
              >
                <p>{item.text}</p>
                {item.doctors?.length ? (
                  <div className="mt-3 space-y-2">
                    {item.doctors.map((doctor) => (
                      <Link
                        key={doctor.id}
                        href={`/patient-portal/doctors/${doctor.id}`}
                        className="block rounded-md border border-teal-100 bg-white p-2 text-gray-800 hover:border-teal-300"
                      >
                        <span className="block font-semibold">{doctor.name}</span>
                        <span className="block text-xs text-teal-700">{doctor.specialization}</span>
                        <span className="mt-1 block text-xs text-gray-500">{doctor.reason}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {assistantLoading ? (
            <div className="flex justify-start">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Thinking...
              </div>
            </div>
          ) : null}
        </div>
        <form onSubmit={sendAssistantMessage} className="flex gap-2 border-t border-gray-100 p-3">
          <input
            value={assistantInput}
            onChange={(event) => setAssistantInput(event.target.value)}
            placeholder="Describe a symptom or health concern..."
            className="h-10 flex-1 rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={assistantLoading || !assistantInput.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Ask
          </button>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/patient-portal/appointments" className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 sm:text-sm">{t('patientPortal.dashboard.upcomingAppointments')}</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Link>

        <Link href="/patient-portal/reports" className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 sm:text-sm">{t('patientPortal.dashboard.medicalReports')}</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{stats.totalReports}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Link>

        <Link href="/patient-portal/prescriptions" className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 sm:text-sm">{t('patientPortal.dashboard.prescriptions')}</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{stats.activePrescriptions}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
              <Pill className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Link>

        <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 sm:text-sm">{t('patientPortal.dashboard.pendingResults')}</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{stats.pendingResults}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-1.5 border-b border-gray-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
              <Calendar className="h-4 w-4 text-teal-600" />
              {t('patientPortal.dashboard.recentAppointments')}
            </h2>
            <Link href="/patient-portal/appointments" className="flex items-center gap-0.5 text-xs font-medium text-teal-600 hover:text-teal-700 sm:text-sm">
              {t('patientPortal.dashboard.viewAll')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-3">
            {recentAppointments.length > 0 ? (
              <div className="space-y-2">
                {recentAppointments.map((apt) => (
                  <div key={apt._id} className="flex flex-wrap items-center gap-3 rounded-md bg-gray-50 p-2 transition-colors hover:bg-gray-100 sm:flex-nowrap">
                    <div className={`h-10 w-0.5 shrink-0 rounded-full ${getAppointmentTypeColor(apt.appointmentType)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{apt.doctorName}</p>
                      <p className="text-xs text-gray-500 sm:text-sm">
                        {formatDate(apt.appointmentDate)} at {apt.appointmentTime}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${getStatusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500">
                <Calendar className="mx-auto mb-1.5 h-10 w-10 text-gray-300" />
                <p className="text-sm">{t('patientPortal.dashboard.noAppointments')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-1.5 border-b border-gray-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
              <FileText className="h-4 w-4 text-teal-600" />
              {t('patientPortal.dashboard.recentReports')}
            </h2>
            <Link href="/patient-portal/reports" className="flex items-center gap-0.5 text-xs font-medium text-teal-600 hover:text-teal-700 sm:text-sm">
              {t('patientPortal.dashboard.viewAll')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-3">
            {recentReports.length > 0 ? (
              <div className="space-y-2">
                {recentReports.map((report) => (
                  <Link 
                    key={report._id} 
                    href={`/patient-portal/reports/${report._id}`}
                    className="flex flex-wrap items-center gap-3 rounded-md bg-gray-50 p-2 transition-colors hover:bg-gray-100 sm:flex-nowrap"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-purple-100">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize text-gray-900">{report.reportType} Report</p>
                      <p className="text-xs text-gray-500 sm:text-sm">
                        {formatDate(report.reportDate)} • {report.doctorName}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500">
                <FileText className="mx-auto mb-1.5 h-10 w-10 text-gray-300" />
                <p className="text-sm">{t('patientPortal.dashboard.noReports')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Tips */}
      <div className="rounded-lg border border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-teal-800 sm:text-base">
          <Activity className="h-4 w-4 shrink-0" />
          {t('patientPortal.dashboard.healthTip')}
        </h3>
        <p className="text-sm text-teal-700">
          {t('patientPortal.dashboard.healthTipContent')}
        </p>
      </div>
    </div>
  );
}
