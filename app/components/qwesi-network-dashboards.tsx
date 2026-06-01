'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bed,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Hospital,
  Pill,
  Receipt,
  Siren,
  Stethoscope,
  Users,
  Video,
  WalletCards,
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
  activeAdmissions: 'Active Admissions',
  activePrescriptions: 'Active Prescriptions',
  appointmentsToday: 'Appointments Today',
  availableBeds: 'Available Beds',
  connectedHospitals: 'Hospitals Connected',
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
  upcomingAppointments: 'Upcoming Appointments',
};

const alertLabels: Record<string, string> = {
  criticalEmergency: 'Critical emergency',
  criticalEmergencyPlural: 'Critical emergencies',
  criticalInpatient: 'Critical inpatient',
  criticalInpatientPlural: 'Critical inpatients',
  criticalLabResult: 'Critical lab result',
  criticalLabResultPlural: 'Critical lab results',
  expiringBlood: 'Blood unit expiring soon',
  expiringBloodPlural: 'Blood units expiring soon',
  expiringMedicine: 'Medicine expiring soon',
  expiringMedicinePlural: 'Medicines expiring soon',
  lowStockMedicine: 'Low stock medicine',
  lowStockMedicinePlural: 'Low stock medicines',
  pendingNotification: 'Pending notification',
  pendingProcessing: 'Pending processing',
  reorderRequired: 'Reorder required',
  requiresImmediateAttention: 'Requires immediate attention',
  requiresMonitoring: 'Requires monitoring',
  waitingInER: 'Patient waiting in ER',
  waitingInERPlural: 'Patients waiting in ER',
  withinThirtyDays: 'Within 30 days',
};

const roleTitles: Record<string, { title: string; description: string }> = {
  admin: {
    title: 'Admin Dashboard',
    description: 'Control patients, providers, billing, operations, approvals, and clinical activity.',
  },
  doctor: {
    title: 'Doctor Dashboard',
    description: 'Your assigned patients, appointments, reports, lab work, and care activity.',
  },
  staff: {
    title: 'Staff Dashboard',
    description: 'Front desk, appointments, inpatient, emergency, lab, and billing operations.',
  },
  nurse: {
    title: 'Nurse Dashboard',
    description: 'Patient monitoring, admissions, urgent tasks, appointments, and care coordination.',
  },
  patient: {
    title: 'Patient Dashboard',
    description: 'Appointments, reports, prescriptions, telemedicine, and care updates.',
  },
  pharmacy: {
    title: 'Pharmacy Dashboard',
    description: 'Medicine stock, dispensing queue, expiry alerts, pickup readiness, and revenue.',
  },
  hospital: {
    title: 'Hospital Dashboard',
    description: 'Facility capacity, patients, beds, emergency load, and admissions.',
  },
};

function statIcon(name: string) {
  if (name.includes('Patient')) return Users;
  if (name.includes('Appointment')) return Calendar;
  if (name.includes('Report')) return FileText;
  if (name.includes('Revenue')) return WalletCards;
  if (name.includes('Medicine') || name.includes('Prescription') || name.includes('Dispensing') || name.includes('Pickup')) return Pill;
  if (name.includes('Hospital')) return Hospital;
  if (name.includes('Admission') || name.includes('Bed')) return Bed;
  if (name.includes('Lab')) return FlaskConical;
  return Activity;
}

function activityHref(activity: RecentActivity) {
  if (activity.type === 'appointment') return `/appointments/${activity.id}`;
  if (activity.type === 'report') return `/reports/${activity.id}`;
  if (activity.type === 'admission') return `/inpatient/admissions/${activity.id}`;
  if (activity.type === 'emergency') return `/emergency/${activity.id}`;
  if (activity.type === 'telemedicine') return `/telemedicine/sessions/${activity.id}`;
  if (activity.type === 'pharmacy') return `/pharmacy/dispensing/list`;
  if (activity.type === 'lab') return `/lab/${activity.id}`;
  return '/activity';
}

function alertIcon(icon: string) {
  if (icon === 'emergency') return Siren;
  if (icon === 'lab') return FlaskConical;
  if (icon === 'inpatient') return Bed;
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

    if (data.beds) {
      output.push({
        title: 'Bed Occupancy',
        href: '/inpatient/beds',
        icon: Bed,
        rows: [['Available', data.beds.available], ['Occupied', data.beds.occupied], ['Occupancy', `${data.beds.occupancyRate}%`]],
      });
    }
    if (data.hospitals) {
      output.push({
        title: 'Hospital Network',
        href: '/hospital-network',
        icon: Hospital,
        rows: [['Active hospitals', data.hospitals.active], ['Total hospitals', data.hospitals.total]],
      });
    }
    if (data.inpatient) {
      output.push({
        title: 'Inpatient',
        href: '/inpatient/admissions',
        icon: HeartPulse,
        rows: [['Active admissions', data.inpatient.activeAdmissions], ['Critical patients', data.inpatient.criticalPatients]],
      });
    }
    if (data.laboratory) {
      output.push({
        title: 'Laboratory',
        href: '/lab',
        icon: FlaskConical,
        rows: [['Pending', data.laboratory.pending], ['Urgent', data.laboratory.urgent], ['Critical', data.laboratory.criticalResults]],
      });
    }
    if (data.emergency) {
      output.push({
        title: 'Emergency',
        href: '/emergency',
        icon: Siren,
        rows: [['Active', data.emergency.active], ['Waiting', data.emergency.waiting], ['Critical', data.emergency.critical]],
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
    ...(['admin', 'doctor', 'staff', 'nurse', 'hospital'].includes(role)
      ? [
          ['New Patient', '/patients/new', Users],
          ['Schedule', '/appointments/new', Calendar],
          ['Refer Patient', '/inpatient/admissions/new', Hospital],
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

function HospitalNetworkManager({ enabled, canAdd }: { enabled: boolean; canAdd: boolean }) {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', region: '', city: '', phone: '', email: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    async function loadHospitals() {
      const response = await fetch('/api/inpatient/hospitals?isActive=true', { cache: 'no-store' });
      if (response.ok && active) setHospitals(await response.json());
    }
    loadHospitals();
    return () => {
      active = false;
    };
  }, [enabled]);

  if (!enabled) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canAdd) return;
    setError('');
    const response = await fetch('/api/inpatient/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Failed to add hospital');
      return;
    }
    setHospitals((current) => [data, ...current.filter((hospital) => hospital._id !== data._id)]);
    setForm({ name: '', region: '', city: '', phone: '', email: '' });
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-950">Hospital Network</h2>
        <Link href="/inpatient/admissions/new" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
          New admission <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}
      {canAdd && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 lg:grid-cols-5">
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-9 rounded-md border border-gray-300 px-3 text-sm" placeholder="Hospital name" />
          <input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} className="h-9 rounded-md border border-gray-300 px-3 text-sm" placeholder="Region" />
          <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="h-9 rounded-md border border-gray-300 px-3 text-sm" placeholder="City" />
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-9 rounded-md border border-gray-300 px-3 text-sm" placeholder="Phone" />
          <button type="submit" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700">
            <Building2 className="h-4 w-4" /> Add hospital
          </button>
        </form>
      )}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {hospitals.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState label="No hospitals have been added yet." />
          </div>
        ) : hospitals.slice(0, 12).map((hospital) => (
          <div key={hospital._id} className="rounded-md border border-gray-100 p-3">
            <p className="truncate text-sm font-medium text-gray-950">{hospital.name}</p>
            <p className="text-xs text-gray-500">{[hospital.city, hospital.region].filter(Boolean).join(', ') || hospital.type}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardSurface({ bare = false, forcedRole }: { bare?: boolean; forcedRole?: 'hospital' | 'pharmacy' }) {
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
  const showHospitalManager = role === 'hospital';

  const content = (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {role === 'doctor' ? <Stethoscope className="h-5 w-5 text-blue-700" /> : role === 'hospital' ? <Building2 className="h-5 w-5 text-blue-700" /> : <Activity className="h-5 w-5 text-blue-700" />}
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
          <OperationalCards data={payload.operationalStats} />
          <HospitalNetworkManager enabled={showHospitalManager} canAdd={session?.user?.role === 'admin'} />
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

export function HospitalPortalDashboard() {
  return <DashboardSurface forcedRole="hospital" />;
}

export function HospitalNetworkDashboard() {
  return <DashboardSurface forcedRole="hospital" />;
}

export function AdminAttachedDashboard() {
  return <DashboardSurface />;
}
