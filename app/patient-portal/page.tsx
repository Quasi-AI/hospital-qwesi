'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  Calendar,
  FileText,
  FlaskConical,
  HeartPulse,
  MessageCircle,
  Pill,
  Search,
  Stethoscope,
  Users,
  Video,
  WalletCards,
} from 'lucide-react';
import { DoctorAvatar, doctorTitle, formatFee, type PublicDoctor } from '@/app/components/doctor-card';

type DashboardStat = { name: string; value: string };
type ActivityItem = { id: string; type: string; title: string; description: string; time: string; status?: string };
type AppointmentItem = { id: string; patient: string; time: string; date?: string; type: string; status: string };

type DashboardPayload = {
  profile?: { name?: string };
  stats?: DashboardStat[];
  recentActivities?: ActivityItem[];
  upcomingAppointments?: AppointmentItem[];
  operationalStats?: { wallet?: { planName?: string; status?: string } };
};

const statMeta: Record<string, { label: string; href: string; icon: React.ElementType; tone: string }> = {
  upcomingAppointments: { label: 'Upcoming bookings', href: '/patient-portal/appointments', icon: Calendar, tone: 'from-brand-500 to-brand-700' },
  pendingLabTests: { label: 'Tests pending', href: '/patient-portal/reports', icon: FlaskConical, tone: 'from-indigo-500 to-brand-600' },
  activePrescriptions: { label: 'Prescriptions', href: '/patient-portal/prescriptions', icon: Pill, tone: 'from-violet-400 to-brand-600' },
  reportsGenerated: { label: 'Reports', href: '/patient-portal/reports', icon: FileText, tone: 'from-brand-500 to-brand-700' },
};

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="qw-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-brand-100/70 px-5 py-3.5">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {href && (
          <Link href={href} className="text-xs font-semibold text-brand-700 hover:text-brand-900">
            View all
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function PatientPortalDashboard() {
  const { data: session } = useSession();
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/dashboard', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/public/booking/doctors').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([dash, docs]) => {
      if (!active) return;
      setPayload(dash);
      setDoctors(Array.isArray(docs) ? docs.slice(0, 4) : []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const name = (payload?.profile?.name || session?.user?.name || '').split(' ')[0];
  const upcoming = payload?.upcomingAppointments || [];
  const stats = (payload?.stats || []).filter((s) => statMeta[s.name]);
  const activities = payload?.recentActivities || [];
  const plan = payload?.operationalStats?.wallet?.planName;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Hero */}
      <section className="qw-hero-bg overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <p className="text-sm text-brand-200">Welcome back{name ? `, ${name}` : ''}</p>
        <h1 className="font-display mt-1 text-2xl font-semibold sm:text-3xl">Need to see a doctor?</h1>
        <p className="mt-2 max-w-xl text-sm text-white/75 sm:text-base">
          Browse verified doctors, compare their fees and pay to book your next consultation.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/patient-portal/doctors"
            className="inline-flex items-center justify-center gap-2 rounded-full !bg-white px-6 py-3 font-semibold text-brand-800 shadow-lg transition hover:!bg-brand-50"
          >
            <Search className="h-4 w-4" /> Find a doctor
          </Link>
          <Link
            href="/patient-portal/appointments"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            <Calendar className="h-4 w-4" /> My appointments
          </Link>
        </div>
      </section>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="reveal-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const meta = statMeta[stat.name];
            const Icon = meta.icon;
            return (
              <Link
                key={stat.name}
                href={meta.href}
                className="qw-card p-4 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-brand-600/20 ${meta.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs font-medium text-gray-600">{meta.label}</p>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Upcoming appointments" href="/patient-portal/appointments">
            {loading ? (
              <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ) : upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center">
                <Calendar className="mx-auto h-8 w-8 text-brand-300" />
                <p className="mt-2 text-sm text-gray-600">You have no upcoming appointments.</p>
                <Link href="/patient-portal/doctors" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  Book a doctor <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <Link
                      href="/patient-portal/appointments"
                      className="flex items-center gap-4 rounded-xl bg-white/60 p-3.5 ring-1 ring-brand-100 transition hover:bg-brand-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                        {a.type === 'telemedicine' ? <Video className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-gray-900">{a.patient}</span>
                        <span className="block text-xs text-gray-600">
                          {a.date ? new Date(a.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : ''} · {a.time}
                        </span>
                      </span>
                      <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-brand-800">{a.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent activity">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing yet — your bookings, reports and prescriptions will show up here.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activities.slice(0, 5).map((a) => (
                  <li key={`${a.type}-${a.id}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{a.title}</p>
                      <p className="truncate text-xs text-gray-500">{a.description}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{a.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Top doctors" href="/patient-portal/doctors">
            {loading ? (
              <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
            ) : doctors.length === 0 ? (
              <p className="text-sm text-gray-500">Doctors will appear here once they’re live.</p>
            ) : (
              <ul className="space-y-3">
                {doctors.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/patient-portal/appointments/new?doctorId=${d.id}`}
                      className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-brand-50"
                    >
                      <DoctorAvatar doctor={d} className="h-12 w-12" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{doctorTitle(d.name, d.practitionerType)}</span>
                        <span className="block truncate text-xs text-gray-600">{d.specialization || d.department || 'General Practice'}</span>
                      </span>
                      <span className="text-sm font-bold text-brand-800">{formatFee(d.consultationFee, d.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Quick links">
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  ['Video consults', Video, '/patient-portal/telemedicine'],
                  ['Prescriptions', Pill, '/patient-portal/prescriptions'],
                  ['Lab reports', FlaskConical, '/patient-portal/reports'],
                  ['Messages', MessageCircle, '/patient-portal/messages'],
                  ['Family', Users, '/patient-portal/family'],
                  ['Records', HeartPulse, '/patient-portal/medical-records'],
                ] as [string, React.ElementType, string][]
              ).map(([label, Icon, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-white/60 p-3 text-center text-xs font-semibold text-gray-800 ring-1 ring-brand-100 transition hover:-translate-y-0.5 hover:bg-brand-600 hover:text-white hover:shadow-lg hover:shadow-brand-600/25"
                >
                  <Icon className="h-5 w-5 text-brand-600 transition group-hover:text-white" />
                  {label}
                </Link>
              ))}
            </div>
          </Panel>

          <Link
            href="/patient-portal/subscriptions"
            className="qw-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <WalletCards className="h-6 w-6 shrink-0 text-accent-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">{plan ? `${plan} plan` : 'Save with a care plan'}</span>
              <span className="block text-xs text-gray-600">{plan ? 'Manage your plan' : 'Included consultations with a monthly care plan'}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-accent-600" />
          </Link>
        </div>
      </div>
    </div>
  );
}
