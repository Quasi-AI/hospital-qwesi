'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import DashboardTopToolbar from '../components/DashboardTopToolbar';
import { useTranslations } from '../hooks/useTranslations';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Bed,
  FlaskConical,
  Droplets,
  Siren,
  Pill,
  Video,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  Plus,
  Receipt,
  Building2,
  TestTube,
  Heart,
  Ambulance,
  ChevronRight,
  HeartPulse,
  CircleAlert,
  Info
} from 'lucide-react';

interface DashboardStats {
  nameKey: string;
  value: string;
  change: string;
  changeType: string;
  icon: any;
  color: string;
}

interface OperationalStats {
  beds: {
    total: number;
    available: number;
    occupied: number;
    occupancyRate: number;
  };
  inpatient: {
    activeAdmissions: number;
    criticalPatients: number;
  };
  billing: {
    pendingInvoices: number;
    todayRevenue: number;
  };
  laboratory: {
    pending: number;
    urgent: number;
    criticalResults: number;
  };
  bloodBank: {
    inventory: { _id: string; count: number }[];
    isLowStock: boolean;
    expiringSoon: number;
  };
  emergency: {
    active: number;
    critical: number;
    waiting: number;
  };
  pharmacy: {
    lowStock: number;
    expiringSoon: number;
  };
  telemedicine: {
    active: number;
    waiting: number;
  };
}

interface CriticalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  titleKey: string;
  descriptionKey: string;
  count: number;
  link: string;
  icon: string;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  status?: string;
  icon?: any;
  color?: string;
}

interface UpcomingAppointment {
  id: string;
  patient: string;
  time: string;
  type: string;
  status: string;
}

const getAlertIcon = (icon: string) => {
  switch (icon) {
    case 'emergency': return Siren;
    case 'lab': return FlaskConical;
    case 'inpatient': return Bed;
    case 'pharmacy': return Pill;
    case 'blood': return Droplets;
    default: return AlertCircle;
  }
};

const getAlertStyles = (type: string) => {
  switch (type) {
    case 'critical':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-800';
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

const getAlertIconStyles = (type: string) => {
  switch (type) {
    case 'critical':
      return 'text-red-600';
    case 'warning':
      return 'text-amber-600';
    case 'info':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();

  const [stats, setStats] = useState<DashboardStats[]>([]);
  const [operationalStats, setOperationalStats] = useState<OperationalStats | null>(null);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (dataFetchedRef.current) return;

      try {
        setIsLoading(true);
        dataFetchedRef.current = true;

        const response = await fetch('/api/dashboard');

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();

        const transformedStats = data.stats.map((stat: any) => {
          let icon, color;
          switch (stat.name) {
            case 'totalPatients':
              icon = Users;
              color = 'blue';
              break;
            case 'appointmentsToday':
              icon = Calendar;
              color = 'green';
              break;
            case 'reportsGenerated':
              icon = FileText;
              color = 'purple';
              break;
            case 'todayRevenue':
              icon = DollarSign;
              color = 'emerald';
              break;
            default:
              icon = Activity;
              color = 'gray';
          }

          return {
            nameKey: stat.name,
            value: stat.value,
            change: stat.change,
            changeType: stat.changeType,
            icon,
            color
          };
        });

        const transformedActivities = data.recentActivities.map((activity: any) => {
          let icon, color;
          switch (activity.type) {
            case 'appointment':
              icon = Calendar;
              color = 'green';
              break;
            case 'patient':
              icon = Users;
              color = 'blue';
              break;
            case 'report':
              icon = FileText;
              color = 'purple';
              break;
            case 'emergency':
              icon = Siren;
              color = 'red';
              break;
            case 'admission':
              icon = Bed;
              color = 'indigo';
              break;
            default:
              icon = Activity;
              color = 'gray';
          }

          return {
            ...activity,
            icon,
            color
          };
        });

        setStats(transformedStats);
        setOperationalStats(data.operationalStats);
        setCriticalAlerts(data.criticalAlerts || []);
        setRecentActivities(transformedActivities);
        setUpcomingAppointments(data.upcomingAppointments || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setStats([
          { nameKey: 'totalPatients', value: '0', change: '0%', changeType: 'neutral', icon: Users, color: 'blue' },
          { nameKey: 'appointmentsToday', value: '0', change: '0%', changeType: 'neutral', icon: Calendar, color: 'green' },
          { nameKey: 'reportsGenerated', value: '0', change: '0%', changeType: 'neutral', icon: FileText, color: 'purple' },
          { nameKey: 'todayRevenue', value: formatCurrency(0), change: '0%', changeType: 'neutral', icon: DollarSign, color: 'emerald' }
        ]);
        setRecentActivities([]);
        setUpcomingAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (translationsLoaded && !dataFetchedRef.current) {
      fetchDashboardData();
    }
  }, [t, translationsLoaded]);

  if (status === 'loading' || !translationsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('navigation.dashboard')} 
        description={t('dashboard.description')}
        topRight={<DashboardTopToolbar compact />}
        dense
      >
        <div className="space-y-3">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-3 sm:p-4 text-white shadow-md">
            <h1 className="text-lg sm:text-xl font-bold mb-0.5">
              {t('dashboard.welcome.title', { name: session?.user?.name || 'Doctor' })}
            </h1>
            <p className="text-blue-100 text-sm leading-snug">
              {t('dashboard.welcome.subtitle')}
            </p>
          </div>

          {/* Critical Alerts Section */}
          {criticalAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <CircleAlert className="h-4 w-4 text-red-600 shrink-0" />
                {t('dashboard.criticalAlerts.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {criticalAlerts.map((alert) => {
                  const AlertIcon = getAlertIcon(alert.icon);
                  return (
                    <Link
                      key={alert.id}
                      href={alert.link}
                      className={`flex items-center gap-2 p-2.5 rounded-md border transition-all hover:shadow-sm ${getAlertStyles(alert.type)}`}
                    >
                      <AlertIcon className={`h-4 w-4 flex-shrink-0 ${getAlertIconStyles(alert.type)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{t(`dashboard.criticalAlerts.${alert.titleKey}`, { count: alert.count })}</p>
                        <p className="text-xs opacity-75">{t(`dashboard.criticalAlerts.${alert.descriptionKey}`)}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-3.5 animate-pulse border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-1.5"></div>
                      <div className="h-2.5 bg-gray-200 rounded w-1/4"></div>
                    </div>
                    <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))
            ) : (
              stats.map((stat) => {
                let href = '#';
                switch (stat.nameKey) {
                  case 'totalPatients':
                    href = '/patients';
                    break;
                  case 'appointmentsToday':
                    href = '/appointments';
                    break;
                  case 'reportsGenerated':
                    href = '/reports';
                    break;
                  case 'todayRevenue':
                    href = '/billing';
                    break;
                }

                return (
                  <Link
                    key={stat.nameKey}
                    href={href}
                    className="bg-white rounded-lg shadow-sm p-3.5 hover:shadow transition-all cursor-pointer border border-gray-100"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500 truncate">{t(`dashboard.stats.${stat.nameKey}`)}</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">{stat.value}</p>
                        <p className={`text-xs mt-0.5 truncate ${
                          stat.changeType === 'positive' ? 'text-green-600' :
                          stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {stat.change} {t('dashboard.stats.changeFromLastMonth')}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg bg-${stat.color}-100 shrink-0`}>
                        <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Operational Stats Grid */}
          {operationalStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Bed Occupancy */}
              <Link href="/inpatient/beds" className="bg-white rounded-lg shadow-sm p-3 hover:shadow transition-all border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">{t('dashboard.operationalStats.bedOccupancy')}</h4>
                  <Bed className="h-4 w-4 text-indigo-600 shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.available')}</span>
                    <span className="font-medium text-green-600">{operationalStats.beds.available}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.occupied')}</span>
                    <span className="font-medium text-orange-600">{operationalStats.beds.occupied}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className={`h-1.5 rounded-full ${
                        operationalStats.beds.occupancyRate > 85 ? 'bg-red-500' : 
                        operationalStats.beds.occupancyRate > 70 ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${operationalStats.beds.occupancyRate}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-gray-500 text-right">{t('dashboard.operationalStats.percentOccupied', { percent: operationalStats.beds.occupancyRate })}</p>
                </div>
              </Link>

              {/* Active Inpatients */}
              <Link href="/inpatient/admissions" className="bg-white rounded-lg shadow-sm p-3 hover:shadow transition-all border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.operationalStats.inpatients')}</h4>
                  <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.activeAdmissions')}</span>
                    <span className="font-medium">{operationalStats.inpatient.activeAdmissions}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.criticalPatients')}</span>
                    <span className={`font-medium ${operationalStats.inpatient.criticalPatients > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {operationalStats.inpatient.criticalPatients}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Laboratory */}
              <Link href="/lab" className="bg-white rounded-lg shadow-sm p-3 hover:shadow transition-all border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.operationalStats.laboratory')}</h4>
                  <FlaskConical className="h-4 w-4 text-cyan-600 shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.pendingTests')}</span>
                    <span className="font-medium">{operationalStats.laboratory.pending}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.urgent')}</span>
                    <span className={`font-medium ${operationalStats.laboratory.urgent > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {operationalStats.laboratory.urgent}
                    </span>
                  </div>
                  {operationalStats.laboratory.criticalResults > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t('dashboard.operationalStats.criticalResults')}</span>
                      <span className="font-medium text-red-600">{operationalStats.laboratory.criticalResults}</span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Emergency */}
              <Link href="/emergency" className="bg-white rounded-lg shadow-sm p-3 hover:shadow transition-all border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.operationalStats.emergency')}</h4>
                  <Siren className="h-4 w-4 text-red-600 shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.activeCases')}</span>
                    <span className="font-medium">{operationalStats.emergency.active}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.waiting')}</span>
                    <span className={`font-medium ${operationalStats.emergency.waiting > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {operationalStats.emergency.waiting}
                    </span>
                  </div>
                  {operationalStats.emergency.critical > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t('dashboard.operationalStats.critical')}</span>
                      <span className="font-medium text-red-600">{operationalStats.emergency.critical}</span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Blood Bank */}
              <Link href="/blood-bank" className="bg-white rounded-lg shadow-sm p-3 hover:shadow transition-all border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.operationalStats.bloodBank')}</h4>
                  <Droplets className="h-4 w-4 text-red-500 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => {
                    const item = operationalStats.bloodBank.inventory.find(i => i._id === group);
                    const count = item?.count || 0;
                    return (
                      <span 
                        key={group}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-full ${
                          count === 0 ? 'bg-red-100 text-red-700' :
                          count < 5 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}
                      >
                        {group}: {count}
                      </span>
                    );
                  })}
                </div>
                {operationalStats.bloodBank.expiringSoon > 0 && (
                  <p className="text-[11px] text-amber-600 mt-1.5 leading-tight">
                    {t('dashboard.operationalStats.unitsExpiringSoon', { count: operationalStats.bloodBank.expiringSoon })}
                  </p>
                )}
              </Link>

              {/* Pharmacy */}
              <Link href="/pharmacy" className="bg-white rounded-lg shadow-sm p-3 hover:shadow transition-all border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.operationalStats.pharmacy')}</h4>
                  <Pill className="h-4 w-4 text-green-600 shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.lowStockItems')}</span>
                    <span className={`font-medium ${operationalStats.pharmacy.lowStock > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {operationalStats.pharmacy.lowStock}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.expiringSoon')}</span>
                    <span className={`font-medium ${operationalStats.pharmacy.expiringSoon > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {operationalStats.pharmacy.expiringSoon}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Telemedicine */}
              <Link href="/telemedicine" className="bg-white rounded-lg shadow-sm p-3 hover:shadow transition-all border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.operationalStats.telemedicine')}</h4>
                  <Video className="h-4 w-4 text-blue-600 shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.activeSessions')}</span>
                    <span className="font-medium text-green-600">{operationalStats.telemedicine.active}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.waitingRoom')}</span>
                    <span className="font-medium">{operationalStats.telemedicine.waiting}</span>
                  </div>
                </div>
              </Link>

              {/* Pending Billing */}
              <Link href="/billing" className="bg-white rounded-lg shadow-sm p-3 hover:shadow transition-all border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.operationalStats.billing')}</h4>
                  <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.pendingInvoices')}</span>
                    <span className={`font-medium ${operationalStats.billing.pendingInvoices > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {operationalStats.billing.pendingInvoices}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('dashboard.operationalStats.todaysRevenue')}</span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(operationalStats.billing.todayRevenue)}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900">{t('dashboard.recentActivity.title')}</h3>
                <Link
                  href="/activity"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                >
                  {t('dashboard.recentActivity.viewAll') || 'View All'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="p-3">
                {isLoading ? (
                  <div className="space-y-2.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-start space-x-2 animate-pulse">
                        <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0"></div>
                        <div className="flex-1">
                          <div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5"></div>
                          <div className="h-2.5 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-1">
                    {recentActivities.slice(0, 8).map((activity) => {
                      let href = '#';
                      if (activity.type === 'patient') href = '/patients';
                      else if (activity.type === 'appointment') href = `/appointments/${activity.id}`;
                      else if (activity.type === 'report') href = `/reports/${activity.id}`;
                      else if (activity.type === 'emergency') href = `/emergency/${activity.id}`;
                      else if (activity.type === 'admission') href = `/inpatient/admissions/${activity.id}`;

                      return (
                        <Link
                          key={activity.id}
                          href={href}
                          className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <div className={`p-1.5 rounded-full bg-${activity.color}-100 flex-shrink-0`}>
                            <activity.icon className={`h-3.5 w-3.5 text-${activity.color}-600`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{activity.title}</p>
                            <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                          </div>
                          <span className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums">{activity.time}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">{t('dashboard.recentActivity.noActivities') || 'No recent activities'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {/* Upcoming Appointments */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{t('dashboard.upcomingAppointments.title')}</h3>
                  <Link href="/appointments" className="text-xs text-blue-600 hover:text-blue-700 shrink-0">
                    {t('dashboard.upcomingAppointments.viewAll')}
                  </Link>
                </div>
                <div className="p-3">
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="animate-pulse p-2 bg-gray-50 rounded-md">
                          <div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5"></div>
                          <div className="h-2.5 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : upcomingAppointments.length > 0 ? (
                    <div className="space-y-2">
                      {upcomingAppointments.map((appointment) => (
                        <Link
                          key={appointment.id}
                          href={`/appointments/${appointment.id}`}
                          className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{appointment.patient}</p>
                              <p className="text-[11px] text-gray-500 truncate">{appointment.type}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium text-gray-900">{appointment.time}</p>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-0.5 ${
                              appointment.status === 'confirmed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {appointment.status === 'confirmed' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {appointment.status}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <Clock className="h-8 w-8 text-gray-300 mx-auto mb-1.5" />
                      <p className="text-gray-500 text-xs">{t('dashboard.upcomingAppointments.noAppointments') || 'No upcoming appointments'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('dashboard.quickActions.title')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link 
                    href="/patients/new"
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t('dashboard.quickActions.newPatient')}</span>
                  </Link>
                  <Link 
                    href="/appointments/new"
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all"
                  >
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t('dashboard.quickActions.schedule')}</span>
                  </Link>
                  <Link 
                    href="/lab/new"
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                  >
                    <TestTube className="h-5 w-5 text-cyan-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t('dashboard.quickActions.labOrder')}</span>
                  </Link>
                  <Link 
                    href="/billing/invoices/new"
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                  >
                    <Receipt className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t('dashboard.quickActions.newInvoice')}</span>
                  </Link>
                  <Link 
                    href="/inpatient/admissions/new"
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <Bed className="h-5 w-5 text-purple-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t('dashboard.quickActions.admitPatient')}</span>
                  </Link>
                  <Link 
                    href="/emergency/new"
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
                  >
                    <Siren className="h-5 w-5 text-red-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t('dashboard.quickActions.emergency')}</span>
                  </Link>
                  <Link 
                    href="/telemedicine/sessions/new"
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <Video className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t('dashboard.quickActions.telemedicine')}</span>
                  </Link>
                  <Link 
                    href="/reports/new"
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t('dashboard.quickActions.newReport')}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
