'use client';


import { ContentSkeleton } from '@/app/components/Skeletons';
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
  Search,
  ShieldCheck,
  UserPlus,
  Settings,
  MessageCircle,
  HeartPulse,
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

const roleTitles: Record<string, { title: string; eyebrow: string; description: string }> = {
  admin: { title: 'Admin dashboard', eyebrow: 'Platform overview', description: 'Practitioners, bookings, consultation revenue, approvals and pharmacy activity.' },
  doctor: { title: 'Practitioner dashboard', eyebrow: 'Doctors & herbalists', description: 'Your booked consultations, patients, earnings and care activity.' },
  staff: { title: 'Staff dashboard', eyebrow: 'Operations', description: 'Bookings, patients and billing support.' },
  nurse: { title: 'Care dashboard', eyebrow: 'Care coordination', description: 'Virtual follow-ups, appointments and care coordination.' },
  patient: { title: 'Your health dashboard', eyebrow: 'Patient', description: 'Appointments, reports, prescriptions, video consults and care updates.' },
  pharmacy: { title: 'Pharmacy dashboard', eyebrow: 'Pharmacy', description: 'Medicine stock, dispensing queue, expiry alerts, pickup readiness and revenue.' },
};

type HeroAction = { label: string; href: string; icon: React.ElementType };
const heroActions: Record<string, HeroAction[]> = {
  admin: [
    { label: 'Add doctor', href: '/doctors/new', icon: UserPlus },
    { label: 'All doctors', href: '/doctors', icon: Stethoscope },
  ],
  doctor: [
    { label: 'My schedule', href: '/appointments', icon: Calendar },
    { label: 'My fee & profile', href: '/profile', icon: Settings },
  ],
  staff: [{ label: 'Appointments', href: '/appointments', icon: Calendar }],
  nurse: [{ label: 'Appointments', href: '/appointments', icon: Calendar }],
  patient: [
    { label: 'Find a doctor', href: '/patient-portal/doctors', icon: Search },
    { label: 'My appointments', href: '/patient-portal/appointments', icon: Calendar },
  ],
  pharmacy: [
    { label: 'Dispensing queue', href: '/pharmacy/dispensing', icon: ClipboardList },
    { label: 'Add medicine', href: '/pharmacy/medicines/new', icon: Pill },
  ],
};

/** each stat gets its own soft tint (all in the brand family) */
const statTints = [
  'from-brand-500 to-brand-700',
  'from-indigo-500 to-brand-600',
  'from-violet-400 to-brand-600',
  'from-fuchsia-400 to-brand-500',
  'from-brand-400 to-indigo-600',
];

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

function Panel({ title, href, hrefLabel = 'View all', children, className = '' }: { title: string; href?: string; hrefLabel?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`qw-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-brand-100/70 px-4 py-3.5 sm:px-5">
        <h2 className="text-sm font-semibold text-gray-950 sm:text-base">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
            {hrefLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

function EmptyState({ label, icon: Icon = Activity }: { label: string; icon?: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-white/50 p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm text-gray-600">{label}</p>
    </div>
  );
}

function StatGrid({ stats }: { stats: DashboardStat[] }) {
  if (!stats.length) return <EmptyState label="No dashboard metrics yet." />;

  return (
    <div className="reveal-stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat, i) => {
        const Icon = statIcon(stat.name);
        return (
          <div key={stat.name} className="qw-card group p-4 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-brand-600/20 ${statTints[i % statTints.length]}`}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 break-words text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{stat.value}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-600 sm:text-sm">{statLabels[stat.name] || stat.name}</p>
            {stat.change && (
              <p className={`mt-1.5 text-xs font-medium ${stat.changeType === 'negative' ? 'text-red-600' : 'text-brand-700'}`}>{stat.change}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Alerts({ alerts }: { alerts: CriticalAlert[] }) {
  if (!alerts.length) return null;

  return (
    <div className="reveal-stagger grid grid-cols-1 gap-3 lg:grid-cols-3">
      {alerts.map((alert) => {
        const Icon = alertIcon(alert.icon);
        const tone = alert.type === 'critical'
          ? 'border-red-200 bg-red-50/80 text-red-800'
          : alert.type === 'warning'
            ? 'border-amber-200 bg-amber-50/80 text-amber-900'
            : 'border-brand-200 bg-brand-50/80 text-brand-900';

        return (
          <Link key={alert.id} href={alert.link} className={`flex items-center gap-3 rounded-2xl border p-3.5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
              <Icon className="h-5 w-5" />
            </span>
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
      output.push({ title: 'Lab requests', href: '/lab', icon: FlaskConical, rows: [['Pending', data.laboratory.pending], ['Urgent', data.laboratory.urgent], ['Critical', data.laboratory.criticalResults]] });
    }
    if (data.pharmacy) {
      output.push({
        title: 'Pharmacy',
        href: '/pharmacy',
        icon: Pill,
        rows: [['Low stock', data.pharmacy.lowStock ?? 0], ['Expiring soon', data.pharmacy.expiringSoon ?? 0], ['Pending', data.pharmacy.pendingDispensing ?? data.pharmacy.pendingPrescriptions ?? 0]],
      });
    }
    if (data.telemedicine) {
      output.push({ title: 'Video consults', href: '/telemedicine', icon: Video, rows: [['Active', data.telemedicine.active], ['Waiting', data.telemedicine.waiting]] });
    }
    if (data.billing) {
      output.push({ title: 'Billing', href: '/billing', icon: Receipt, rows: [['Pending invoices', data.billing.pendingInvoices], ['Today revenue', data.billing.todayRevenue], ['Monthly revenue', data.billing.monthlyRevenue]] });
    }
    return output;
  }, [data]);

  if (!cards.length) return null;

  return (
    <div className="reveal-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href} className="qw-card p-4 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-950">{card.title}</h3>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <card.icon className="h-4 w-4" />
            </span>
          </div>
          <div className="space-y-1.5">
            {card.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 text-xs sm:text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-950">{String(value ?? 0)}</span>
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
    <Panel title="Recent activity" href="/activity">
      {!activities.length ? (
        <EmptyState label="Nothing yet — new bookings, reports and prescriptions will appear here." />
      ) : (
        <ul className="space-y-1">
          {activities.map((activity) => (
            <li key={`${activity.type}-${activity.id}`}>
              <Link href={activityHref(activity)} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-brand-50/70">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-950">{activity.title}</p>
                  <p className="truncate text-xs text-gray-600">{activity.description}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-500">{activity.time}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function UpcomingList({ appointments, patientMode }: { appointments: UpcomingAppointment[]; patientMode?: boolean }) {
  return (
    <Panel title="Upcoming appointments" href={patientMode ? '/patient-portal/appointments' : '/appointments'}>
      {!appointments.length ? (
        <EmptyState icon={Calendar} label="No upcoming appointments." />
      ) : (
        <ul className="space-y-2">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <Link
                href={patientMode ? '/patient-portal/appointments' : `/appointments/${appointment.id}`}
                className="flex items-center gap-3 rounded-xl bg-white/60 p-3 ring-1 ring-brand-100 transition hover:bg-brand-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  {appointment.type === 'telemedicine' ? <Video className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-950">{appointment.patient}</p>
                  <p className="truncate text-xs capitalize text-gray-600">{appointment.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-950">{appointment.time}</p>
                  <p className="text-[11px] font-semibold capitalize text-brand-700">{appointment.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function QuickActions({ role }: { role: string }) {
  const sets: Record<string, [string, string, React.ElementType][]> = {
    patient: [
      ['Find a doctor', '/patient-portal/doctors', Search],
      ['Video consults', '/patient-portal/telemedicine', Video],
      ['Prescriptions', '/patient-portal/prescriptions', Pill],
      ['Lab reports', '/patient-portal/reports', FlaskConical],
      ['Messages', '/patient-portal/messages', MessageCircle],
      ['Records', '/patient-portal/medical-records', HeartPulse],
    ],
    doctor: [
      ['Schedule', '/appointments', Calendar],
      ['Start video consult', '/telemedicine/sessions/new', Video],
      ['My patients', '/patients', Users],
      ['Lab request', '/lab/new', FlaskConical],
      ['Messages', '/messages', MessageCircle],
      ['My fee & profile', '/profile', Settings],
    ],
    admin: [
      ['Add doctor', '/doctors/new', UserPlus],
      ['Doctors', '/doctors', Stethoscope],
      ['Patients', '/patients', Users],
      ['Pharmacy', '/pharmacy', Pill],
      ['Billing', '/billing', Receipt],
      ['Approvals', '/users', ShieldCheck],
    ],
    pharmacy: [
      ['Dispensing', '/pharmacy/dispensing', ClipboardList],
      ['Add medicine', '/pharmacy/medicines/new', Pill],
      ['Inventory', '/pharmacy/inventory', Pill],
      ['Profile', '/profile', Settings],
    ],
    staff: [
      ['Appointments', '/appointments', Calendar],
      ['Patients', '/patients', Users],
      ['Billing', '/billing', Receipt],
    ],
    nurse: [
      ['Appointments', '/appointments', Calendar],
      ['Patients', '/patients', Users],
      ['Video consults', '/telemedicine/sessions/new', Video],
    ],
  };
  const actions = sets[role] || sets.doctor;

  return (
    <Panel title="Quick actions">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2">
        {actions.map(([label, href, Icon]) => (
          <Link
            key={label}
            href={href}
            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-white/60 p-3 text-center text-xs font-semibold text-gray-800 ring-1 ring-brand-100 transition hover:-translate-y-0.5 hover:bg-brand-600 hover:text-white hover:shadow-lg hover:shadow-brand-600/25"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-white/20 group-hover:text-white">
              <Icon className="h-5 w-5" />
            </span>
            {label}
          </Link>
        ))}
      </div>
    </Panel>
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
  if (!status || status === 'approved') return 'bg-brand-50 text-brand-700 ring-brand-200';
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
    <section className="qw-card p-4 sm:p-5">
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
          <ContentSkeleton />
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
                          className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
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

  const heroName = (session?.user?.name || payload?.profile?.name || '').replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').split(' ')[0];
  const actionsForHero = heroActions[role] || heroActions.doctor;

  const content = (
    <div className="space-y-5 sm:space-y-6">
      <section className="qw-hero-bg overflow-hidden rounded-3xl p-5 text-white sm:p-8">
        <div className="hero-in flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">{meta.eyebrow}</p>
            <h1 className="font-display mt-1 text-2xl font-semibold sm:text-4xl">
              {heroName ? `Welcome back, ${heroName}` : meta.title}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/75 sm:text-base">{meta.description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {actionsForHero.map(({ label, href, icon: Icon }, i) => (
              <Link
                key={label}
                href={href}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  i === 0 ? '!bg-white text-brand-800 shadow-lg hover:!bg-brand-50' : 'border border-white/30 text-white hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="qw-card h-36 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="qw-card h-72 animate-pulse" />
            <div className="qw-card h-72 animate-pulse" />
          </div>
        </div>
      ) : payload ? (
        <>
          <Alerts alerts={payload.criticalAlerts || []} />
          <StatGrid stats={payload.stats || []} />
          {role === 'pharmacy' && session?.user?.role === 'admin' ? <PharmacyApprovalPanel /> : null}
          <OperationalCards data={payload.operationalStats} />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <ActivityList activities={payload.recentActivities || []} />
            <div className="space-y-5">
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
