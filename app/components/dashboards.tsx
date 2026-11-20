'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  Pill,
  Receipt,
  Stethoscope,
  Users,
  Video,
  WalletCards,
  XCircle,
} from 'lucide-react';
import SidebarLayout from './sidebar-layout';
import DashboardTopToolbar from './DashboardTopToolbar';

type DashboardStat = {
  name: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral' | string;
};

type RecentActivity = {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  status?: string;
};

type UpcomingAppointment = {
  id: string;
  patient: string;
  time: string;
  type: string;
  status: string;
};

type CriticalAlert = {
  id: string;
  type: 'critical' | 'warning' | 'info';
  titleKey: string;
  descriptionKey: string;
  count: number;
  link: string;
  icon: string;
};

type DashboardPayload = {
  dashboardRole: string;
  profile?: { name?: string; patientId?: string };
  stats: DashboardStat[];
  operationalStats?: Record<string, any>;
  criticalAlerts?: CriticalAlert[];
  recentActivities?: RecentActivity[];
  upcomingAppointments?: UpcomingAppointment[];
};

const statLabels: Record<string, string> = {
  activePrescriptions: 'Active Prescriptions',
  appointmentsToday: 'Appointments Today',
  monthlyRevenue: 'Monthly Revenue',
  myPatients: 'My Patients',
  pendingDispensing: 'Pending Dispensing',
  pendingLabTests: 'Pending Lab Tests',
  readyForPickup: 'Ready for Pickup',
  referrals: 'Referrals',
  reportsGenerated: 'Reports Generated',
  todayRevenue: "Today's Revenue",
  totalMedicines: 'Total Medicines',
  totalPatients: 'Total Patients',
  totalDoctors: 'Verified Doctors',
  upcomingAppointments: 'Upcoming Appointments',
};

const alertLabels: Record<string, string> = {
  criticalLabResult: 'Critical lab result',
  criticalLabResultPlural: 'Critical lab results',
  expiringMedicine: 'Medicine expiring soon',
  expiringMedicinePlural: 'Medicines expiring soon',
  lowStockMedicine: 'Low stock medicine',
  lowStockMedicinePlural: 'Low stock medicines',
  pendingApproval: 'Provider awaiting approval',
  pendingApprovalPlural: 'Providers awaiting approval',
  requiresReview: 'Needs your review',
  pendingNotification: 'Pending notification',
  pendingProcessing: 'Pending processing',
  reorderRequired: 'Reorder required',
  requiresImmediateAttention: 'Requires immediate attention',
  requiresMonitoring: 'Requires monitoring',
  withinThirtyDays: 'Within 30 days',
};

const roleTitles: Record<string, { title: string; description: string }> = {
  admin: {
    title: 'Admin Dashboard',
    description: 'Doctors, bookings, consultation revenue, approvals and pharmacy activity.',
  },
  doctor: {
    title: 'Doctor Dashboard',
    description: 'Your booked consultations, patients, earnings and care activity.',
  },
  staff: {
    title: 'Staff Dashboard',
    description: 'Bookings, patients, lab coordination and billing support.',
  },
  nurse: {
    title: 'Nurse Dashboard',
    description: 'Virtual follow-ups, appointments and care coordination.',
  },
  patient: {
    title: 'Patient Dashboard',
    description: 'Appointments, reports, prescriptions, telemedicine, and care updates.',
  },
  pharmacy: {
    title: 'Pharmacy Dashboard',
    description: 'Medicine stock, dispensing queue, expiry alerts, pickup readiness, and revenue.',
  },
};

function statIcon(name: string) {
  if (name.includes('Patient')) return Users;
  if (name.includes('Appointment')) return Calendar;
  if (name.includes('Report')) return FileText;
  if (name.includes('Revenue')) return WalletCards;
  if (name.includes('Medicine') || name.includes('Prescription') || name.includes('Dispensing') || name.includes('Pickup')) return Pill;
  if (name.includes('Doctor')) return Stethoscope;
  if (name.includes('Lab')) return FlaskConical;
  return Activity;
}

function activityHref(activity: RecentActivity) {
  if (activity.type === 'appointment') return `/appointments/${activity.id}`;
  if (activity.type === 'report') return `/reports/${activity.id}`;
  if (activity.type === 'patient') return `/patients/${activity.id}`;
  if (activity.type === 'telemedicine') return `/telemedicine/sessions/${activity.id}`;
  if (activity.type === 'pharmacy') return `/pharmacy/dispensing/list`;
  if (activity.type === 'lab') return `/lab/${activity.id}`;
  return '/activity';
}

function alertIcon(icon: string) {
  if (icon === 'doctor') return Stethoscope;
  if (icon === 'lab') return FlaskConical;
  if (icon === 'pharmacy') return Pill;
  return AlertTriangle;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
      <Activity className="mx-auto h-8 w-8 text-gray-300" />
      <p className="mt-2 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function StatGrid({ stats }: { stats: DashboardStat[] }) {
  if (!stats.length) return <EmptyState label="No dashboard metrics returned by the API yet." />;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => {
        const Icon = statIcon(stat.name);
        return (
          <div key={stat.name} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500">{statLabels[stat.name] || stat.name}</p>
                <p className="mt-2 break-words text-2xl font-bold text-gray-950">{stat.value}</p>
                {stat.change && (
                  <p className={`mt-1 text-xs ${stat.changeType === 'negative' ? 'text-red-600' : stat.changeType === 'positive' ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {stat.change}
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Alerts({ alerts }: { alerts: CriticalAlert[] }) {
  if (!alerts.length) return null;

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
      {alerts.map((alert) => {
        const Icon = alertIcon(alert.icon);
        const tone = alert.type === 'critical'
          ? 'border-red-200 bg-red-50 text-red-800'
          : alert.type === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-blue-200 bg-blue-50 text-blue-800';

        return (
          <Link key={alert.id} href={alert.link} className={`flex items-center gap-3 rounded-lg border p-3 ${tone}`}>
            <Icon className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{alert.count} {alertLabels[alert.titleKey] || alert.titleKey}</p>
              <p className="text-xs opacity-80">{alertLabels[alert.descriptionKey] || alert.descriptionKey}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}

function OperationalCards({ data }: { data?: Record<string, any> }) {
  const cards = useMemo(() => {
    if (!data) return [];
    const output: { title: string; href: string; icon: React.ElementType; rows: [string, string | number][] }[] = [];

    if (data.laboratory) {
      output.push({
        title: 'Laboratory',
        href: '/lab',
        icon: FlaskConical,
        rows: [['Pending', data.laboratory.pending], ['Urgent', data.laboratory.urgent], ['Critical', data.laboratory.criticalResults]],
      });
    }
    if (data.pharmacy) {
      output.push({
        title: 'Pharmacy',
        href: '/pharmacy',
        icon: Pill,
        rows: [
          ['Low stock', data.pharmacy.lowStock ?? 0],
          ['Expiring soon', data.pharmacy.expiringSoon ?? 0],
          ['Pending', data.pharmacy.pendingDispensing ?? data.pharmacy.pendingPrescriptions ?? 0],
        ],
      });
    }
    if (data.telemedicine) {
      output.push({
        title: 'Telemedicine',
        href: '/telemedicine',
        icon: Video,
        rows: [['Active', data.telemedicine.active], ['Waiting', data.telemedicine.waiting]],
      });
    }
    if (data.billing) {
      output.push({
        title: 'Billing',
        href: '/billing',
        icon: Receipt,
        rows: [['Pending invoices', data.billing.pendingInvoices], ['Today revenue', data.billing.todayRevenue], ['Monthly revenue', data.billing.monthlyRevenue]],
      });
    }

    return output;
  }, [data]);

  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-200 hover:shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-950">{card.title}</h3>
            <card.icon className="h-5 w-5 text-blue-700" />
          </div>
          <div className="space-y-1">
            {card.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 text-xs">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{String(value ?? 0)}</span>
              </div>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}

function ActivityList({ activities }: { activities: RecentActivity[] }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-950">Recent Activity</h2>
        <Link href="/activity" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="p-3">
        {!activities.length ? (
          <EmptyState label="No recent activity found." />
        ) : (
          <div className="space-y-1">
            {activities.map((activity) => (
              <Link key={`${activity.type}-${activity.id}`} href={activityHref(activity)} className="flex items-start gap-3 rounded-md p-2 hover:bg-gray-50">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-950">{activity.title}</p>
                  <p className="truncate text-xs text-gray-500">{activity.description}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{activity.time}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function UpcomingList({ appointments, patientMode }: { appointments: UpcomingAppointment[]; patientMode?: boolean }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-950">Upcoming Appointments</h2>
        <Link href={patientMode ? '/patient-portal/appointments' : '/appointments'} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="p-3">
        {!appointments.length ? (
          <EmptyState label="No upcoming appointments found." />
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <Link key={appointment.id} href={patientMode ? '/patient-portal/appointments' : `/appointments/${appointment.id}`} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 p-3 hover:bg-gray-100">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-950">{appointment.patient}</p>
                  <p className="text-xs text-gray-500">{appointment.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{appointment.time}</p>
                  <p className="text-xs text-gray-500">{appointment.status}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function QuickActions({ role }: { role: string }) {
  const actions = [
    ...(role === 'patient'
      ? [
          ['Book Appointment', '/patient-portal/appointments/new', Calendar],
          ['My Reports', '/patient-portal/reports', FileText],
          ['Prescriptions', '/patient-portal/prescriptions', Pill],
          ['Messages', '/patient-portal/messages', Users],
        ]
      : []),
    ...(['admin', 'doctor', 'staff', 'nurse'].includes(role)
      ? [
          ['New Patient', '/patients/new', Users],
          ['Schedule', '/appointments/new', Calendar],
          ...(role === 'admin' ? [['Add Doctor', '/doctors/new', Stethoscope]] : []),
          ['Lab Order', '/lab/new', FlaskConical],
          ['Telemedicine', '/telemedicine/sessions/new', Video],
        ]
      : []),
    ...(['admin', 'staff', 'pharmacy'].includes(role)
      ? [
          ['Add Medicine', '/pharmacy/medicines/new', Pill],
          ['Dispensing', '/pharmacy/dispensing', ClipboardList],
          ['Inventory', '/pharmacy/inventory', Pill],
        ]
      : []),
  ];

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-950">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(([label, href, Icon]) => (
          <Link key={label as string} href={href as string} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-gray-200 p-3 text-center text-xs font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50">
            <Icon className="h-5 w-5 text-blue-700" />
            {label as string}
          </Link>
        ))}
      </div>
    </section>
  );
}

type PharmacyProvider = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  approvalStatus?: string;
  licenseNumber?: string;
  medicineCount?: number;
  licenseCertificate?: { fileName?: string; data?: string };
};

function approvalBadgeClass(status?: string) {
  if (!status || status === 'approved') return 'bg-green-50 text-green-700 ring-green-200';
  if (status === 'rejected') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-amber-50 text-amber-800 ring-amber-200';
}

function PharmacyApprovalPanel() {
  const [providers, setProviders] = useState<PharmacyProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pharmacy/providers', { cache: 'no-store' });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'Failed to load pharmacy providers');
      setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load pharmacy providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const updateApproval = async (provider: PharmacyProvider, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt(`Reason for rejecting ${provider.name}`) || '' : '';
    setMessage('');
    try {
      const response = await fetch(`/api/users/${provider._id}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update approval status');
      setMessage(`${provider.name} ${action === 'approve' ? 'approved' : 'rejected'}.`);
      loadProviders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update approval status');
    }
  };

  const pending = providers.filter((provider) => provider.approvalStatus !== 'approved');

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-950">Pharmacy Approvals</h2>
          <p className="mt-0.5 text-xs text-gray-500">Review pharmacy accounts waiting for profile completion, manual approval, or rejection.</p>
        </div>
        <Link href="/profile?returnTo=/pharmacy" className="text-xs font-medium text-blue-700 hover:text-blue-900">
          Provider profile requirements
        </Link>
      </div>
      {message ? (
        <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {message}
        </div>
      ) : null}
      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
          No pharmacy approvals are pending.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Pharmacy</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Profile</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {pending.map((provider) => (
                <tr key={provider._id}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-950">{provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.email}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${approvalBadgeClass(provider.approvalStatus)}`}>
                      {(provider.approvalStatus || 'pending').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    <p>License: {provider.licenseNumber || 'missing'}</p>
                    <p>Certificate: {provider.licenseCertificate?.fileName || provider.licenseCertificate?.data ? 'uploaded' : 'missing'}</p>
                    <p>Medicines: {provider.medicineCount ?? 0}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {provider.approvalStatus !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => updateApproval(provider, 'approve')}
                          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      ) : null}
                      {provider.approvalStatus !== 'rejected' ? (
                        <button
                          type="button"
                          onClick={() => updateApproval(provider, 'reject')}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DashboardSurface({ bare = false, forcedRole }: { bare?: boolean; forcedRole?: 'pharmacy' }) {
  const { data: session } = useSession();
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        setLoading(true);
        const endpoint = forcedRole ? `/api/dashboard?role=${forcedRole}` : '/api/dashboard';
        const response = await fetch(endpoint, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to load dashboard');
        if (active) {
          setPayload(data);
          setError('');
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      active = false;
    };
  }, [forcedRole]);

  const role = payload?.dashboardRole || session?.user?.role || 'doctor';
  const meta = roleTitles[role] || roleTitles.doctor;

  const content = (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {role === 'doctor' ? <Stethoscope className="h-5 w-5 text-blue-700" /> : <Activity className="h-5 w-5 text-blue-700" />}
              <h1 className="text-lg font-bold text-blue-950">{meta.title}</h1>
            </div>
            <p className="mt-1 text-sm text-blue-800">{meta.description}</p>
          </div>
          <p className="text-sm font-medium text-blue-900">{session?.user?.name || payload?.profile?.name || ''}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-white p-3 text-sm text-blue-800">Loading dashboard data...</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-72 animate-pulse rounded-lg border border-gray-200 bg-white" />
            <div className="h-72 animate-pulse rounded-lg border border-gray-200 bg-white" />
          </div>
        </div>
      ) : payload ? (
        <>
          <Alerts alerts={payload.criticalAlerts || []} />
          <StatGrid stats={payload.stats || []} />
          {role === 'pharmacy' && session?.user?.role === 'admin' ? <PharmacyApprovalPanel /> : null}
          <OperationalCards data={payload.operationalStats} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ActivityList activities={payload.recentActivities || []} />
            <div className="space-y-4">
              <UpcomingList appointments={payload.upcomingAppointments || []} patientMode={role === 'patient'} />
              <QuickActions role={role} />
            </div>
          </div>
        </>
      ) : (
        <EmptyState label="Dashboard data could not be loaded." />
      )}
    </div>
  );

  if (bare) return content;

  return (
    <SidebarLayout title={meta.title} description={meta.description} topRight={<DashboardTopToolbar compact />} dense wide>
      {content}
    </SidebarLayout>
  );
}

export function PatientAttachedDashboard() {
  return <DashboardSurface bare />;
}

export function PharmacyAttachedDashboard() {
  return <DashboardSurface forcedRole="pharmacy" />;
}

export function AdminAttachedDashboard() {
  return <DashboardSurface />;
}
