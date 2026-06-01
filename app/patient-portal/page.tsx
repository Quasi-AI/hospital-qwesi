'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  Download,
  FileText,
  FlaskConical,
  HeartPulse,
  Home,
  MessageCircle,
  Pill,
  Plus,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
  WalletCards,
} from 'lucide-react';

type DashboardStat = {
  name: string;
  value: string;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  status?: string;
};

type AppointmentItem = {
  id: string;
  patient: string;
  time: string;
  date?: string;
  type: string;
  status: string;
};

type DashboardPayload = {
  profile?: { name?: string };
  stats?: DashboardStat[];
  recentActivities?: ActivityItem[];
  upcomingAppointments?: AppointmentItem[];
  operationalStats?: {
    care?: { completedAppointments?: number; completedLabTests?: number };
    laboratory?: { pending?: number };
    pharmacy?: { pendingPrescriptions?: number };
    referrals?: { active?: number; latest?: any[] };
    family?: { members?: number; latest?: any[] };
    homeCare?: { active?: number; latest?: any[] };
    wallet?: { planName?: string; status?: string; currency?: string; balance?: number };
  };
};

const statMeta: Record<string, { label: string; href: string; icon: React.ElementType; tone: string }> = {
  upcomingAppointments: { label: 'Upcoming Appointments', href: '/patient-portal/appointments', icon: Calendar, tone: 'bg-emerald-50 text-emerald-700' },
  pendingLabTests: { label: 'Tests Pending', href: '/patient-portal/reports', icon: FlaskConical, tone: 'bg-violet-50 text-violet-700' },
  activePrescriptions: { label: 'Prescriptions', href: '/patient-portal/prescriptions', icon: Pill, tone: 'bg-orange-50 text-orange-700' },
  referrals: { label: 'Referrals', href: '/patient-portal/referrals', icon: ClipboardList, tone: 'bg-blue-50 text-blue-700' },
  reportsGenerated: { label: 'Reports', href: '/patient-portal/reports', icon: FileText, tone: 'bg-cyan-50 text-cyan-700' },
};

function StatCard({ stat }: { stat: DashboardStat }) {
  const meta = statMeta[stat.name] || { label: stat.name, href: '/patient-portal', icon: HeartPulse, tone: 'bg-slate-50 text-slate-700' };
  const Icon = meta.icon;
  return (
    <Link href={meta.href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-600">{meta.label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{stat.value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${meta.tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-right text-xs font-medium text-emerald-700">View all</p>
    </Link>
  );
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        {href && <Link href={href} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">View all</Link>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Avatar({ label, tone = 'bg-emerald-600' }: { label: string; tone?: string }) {
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone} text-sm font-bold text-white`}>
      {label.split(' ').map((part) => part[0]).join('').slice(0, 2)}
    </div>
  );
}

function StatusPill({ children, tone = 'emerald' }: { children: React.ReactNode; tone?: 'emerald' | 'blue' | 'amber' | 'violet' }) {
  const classes = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return <span className={`rounded-md px-2 py-1 text-[11px] font-semibold capitalize ${classes[tone]}`}>{children}</span>;
}

function EmptyInline({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
      <p>{text}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
        {action} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function PatientPortalDashboard() {
  const { data: session } = useSession();
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
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
  }, []);

  const patientName = payload?.profile?.name || session?.user?.name || 'Patient';
  const stats = payload?.stats || [];
  const activities = payload?.recentActivities || [];
  const appointments = payload?.upcomingAppointments || [];
  const reports = activities.filter((activity) => activity.type === 'report' || activity.type === 'lab').slice(0, 4);
  const careTeam = useMemo(() => Array.from(new Set(appointments.map((appointment) => appointment.patient).filter(Boolean))).slice(0, 4), [appointments]);
  const referrals = payload?.operationalStats?.referrals?.latest || [];
  const family = payload?.operationalStats?.family?.latest || [];
  const homeCareTasks = payload?.operationalStats?.homeCare?.latest || [];
  const wallet = payload?.operationalStats?.wallet;

  if (loading) {
    return <div className="rounded-lg border border-emerald-100 bg-white p-4 text-sm text-emerald-800">Loading your dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Welcome back, {patientName.split(' ')[0]}!</h1>
          <p className="text-sm text-slate-600">Here is an overview of your health and care.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/patient-portal/appointments/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">
            <Calendar className="h-4 w-4" />
            Book Appointment
          </Link>
          <Link href="/patient-portal/assistant" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <MessageCircle className="h-4 w-4" />
            Ask AI
          </Link>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => <StatCard key={stat.name} stat={stat} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel title="Upcoming Appointments" href="/patient-portal/appointments">
              {appointments.length === 0 ? (
                <EmptyInline text="No upcoming appointments yet." href="/patient-portal/appointments/new" action="Book appointment" />
              ) : (
                <div className="space-y-3">
                  {appointments.map((appointment, index) => (
                    <Link key={appointment.id} href="/patient-portal/appointments" className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3 hover:bg-slate-50">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar label={appointment.patient} tone={index % 2 ? 'bg-cyan-600' : 'bg-slate-800'} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{appointment.patient}</p>
                          <p className="truncate text-xs text-slate-500">{appointment.type}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-500">
                        <p>{appointment.time}</p>
                        <StatusPill tone={appointment.status === 'confirmed' ? 'emerald' : 'blue'}>{appointment.status}</StatusPill>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Recent Medical Reports" href="/patient-portal/reports">
              {reports.length === 0 ? (
                <EmptyInline text="No reports or lab results available yet." href="/patient-portal/reports" action="Open reports" />
              ) : (
                <div className="space-y-3">
                  {reports.map((report, index) => (
                    <Link key={`${report.type}-${report.id}`} href="/patient-portal/reports" className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3 hover:bg-slate-50">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${index % 2 ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{report.title}</p>
                          <p className="truncate text-xs text-slate-500">{report.description}</p>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <section className="overflow-hidden rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 via-cyan-50 to-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-emerald-950">Your health, our priority.</h2>
                  <p className="mt-1 max-w-xl text-sm text-slate-600">Book appointments, consult doctors, get medicines delivered, and manage your health in one place.</p>
                </div>
              </div>
              <Link href="/patient-portal/appointments/new" className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
                Book Appointment
              </Link>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="Lab & Diagnostics" href="/patient-portal/reports">
              <div className="space-y-3 text-sm">
                <Row icon={FlaskConical} title="Pending tests" detail={`${payload?.operationalStats?.laboratory?.pending || 0} open`} meta="View Results" tone="amber" href="/patient-portal/reports" />
                <Row icon={FileText} title="Completed tests" detail={`${payload?.operationalStats?.care?.completedLabTests || 0} completed`} meta="Reports" tone="emerald" href="/patient-portal/reports" />
              </div>
            </Panel>
            <Panel title="Referrals" href="/patient-portal/referrals">
              {referrals.length === 0 ? (
                <EmptyInline text="No active referrals." href="/patient-portal/doctors" action="Find a doctor" />
              ) : (
                <div className="space-y-3">
                  {referrals.slice(0, 2).map((referral: any) => (
                    <Row key={referral._id} icon={Stethoscope} title={referral.title} detail={referral.referredTo} meta={referral.status} tone="amber" href="/patient-portal/referrals" />
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Prescriptions" href="/patient-portal/prescriptions">
              <div className="space-y-3 text-sm">
                <Row icon={Pill} title="Active prescriptions" detail={`${payload?.operationalStats?.pharmacy?.pendingPrescriptions || 0} pending or ready`} meta="Open" tone="emerald" href="/patient-portal/prescriptions" />
              </div>
            </Panel>
          </div>
        </div>

        <aside className="space-y-4">
          <Panel title="My Care Team" href="/patient-portal/care-team">
            {careTeam.length === 0 ? (
              <EmptyInline text="Your care team will appear after appointments or referrals." href="/patient-portal/doctors" action="Browse doctors" />
            ) : (
              <div className="space-y-3">
                {careTeam.map((name, index) => (
                  <Link key={name} href="/patient-portal/care-team" className="flex items-center gap-3">
                    <Avatar label={name} tone={index % 2 ? 'bg-cyan-600' : 'bg-slate-800'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
                      <p className="truncate text-xs text-slate-500">Connected appointment</p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Next Actions">
            {homeCareTasks.length === 0 && appointments.length === 0 ? (
              <EmptyInline text="No next actions are due." href="/patient-portal/appointments/new" action="Book care" />
            ) : (
              <div className="space-y-2">
                {[...homeCareTasks.map((task: any) => ({ title: task.title, detail: task.status, href: '/patient-portal/home-care' })), ...appointments.map((appointment) => ({ title: `Follow up with ${appointment.patient}`, detail: appointment.time, href: '/patient-portal/appointments' }))].slice(0, 3).map((item) => (
                  <Link key={`${item.title}-${item.detail}`} href={item.href} className="flex items-center justify-between gap-3 rounded-md bg-amber-50 p-3 text-sm hover:bg-amber-100">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Health Wallet">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Balance</p>
                <p className="text-sm font-bold text-slate-950">{wallet?.currency || 'GHS'} {Number(wallet?.balance || 0).toFixed(2)}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Plan</p>
                <p className="truncate text-sm font-bold text-slate-950">{wallet?.planName || 'No active plan'}</p>
              </div>
            </div>
            <Link href="/patient-portal/subscriptions" className="mt-3 flex h-9 items-center justify-center gap-2 rounded-md border border-blue-300 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              <WalletCards className="h-4 w-4" />
              View Wallet
            </Link>
          </Panel>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Family Members" href="/patient-portal/family">
          {family.length === 0 ? (
            <EmptyInline text="No family members linked yet." href="/patient-portal/family" action="Open family" />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {family.map((member: any) => (
                <Link key={member._id} href="/patient-portal/family" className="flex items-center gap-3 rounded-md border border-slate-100 p-3">
                  <Avatar label={member.name} tone="bg-slate-700" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{member.name}</p>
                    <p className="truncate text-xs text-slate-500">{member.relationship}</p>
                  </div>
                </Link>
              ))}
              <Link href="/patient-portal/family" className="flex min-h-16 items-center justify-center gap-2 rounded-md border border-dashed border-emerald-300 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                <Plus className="h-4 w-4" />
                Add Family Member
              </Link>
            </div>
          )}
        </Panel>

        <Panel title="Quick Actions">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {[
              ['Book Doctor', Calendar, '/patient-portal/appointments/new'],
              ['Video Call', Video, '/patient-portal/telemedicine'],
              ['Home Nurse', HeartPulse, '/patient-portal/home-care'],
              ['Upload Report', FileText, '/patient-portal/medical-records'],
            ].map(([label, Icon, href]) => (
              <Link key={label as string} href={href as string} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-slate-200 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Icon className="h-5 w-5 text-emerald-700" />
                {label as string}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  detail,
  meta,
  tone,
  href,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
  meta: string;
  tone: 'emerald' | 'amber';
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3 hover:bg-slate-50">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
          <p className="truncate text-xs text-slate-500">{detail}</p>
        </div>
      </div>
      <p className={`shrink-0 text-xs font-semibold capitalize ${tone === 'emerald' ? 'text-emerald-700' : 'text-amber-700'}`}>{meta}</p>
    </Link>
  );
}
