'use client';

import { LogoLink } from './logo';
import { useCallback, useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import TopNavbar from './TopNavbar';
import { useTranslations } from '../hooks/useTranslations';
import { useSettings } from '../contexts/SettingsContext';
import LanguageSwitcher from './LanguageSwitcher';
import { 
  Users, 
  Calendar, 
  CalendarDays,
  FileText, 
  Receipt,
  Home,
  Stethoscope,
  Plus,
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  Brain,
  TrendingUp,
  Pill,
  Camera,
  Shield,
  LineChart,
  Mic,
  User,
  ChevronDown,
  ChevronRight,
  UserPlus,
  UserCheck,
  Crown,
  List,
  BarChart3,
  PieChart,
  DollarSign,
  Activity,
  Target,
  ClipboardList,
  FlaskConical,
  TestTube,
  ClipboardCheck,
  Building2,
  Bed,
  HeartPulse,
  Radio,
  Image,
  Package,
  Truck,
  ShoppingCart,
  FolderOpen,
  FilePlus,
  Files,
  Siren,
  AlertTriangle,
  Ambulance,
  Cpu,
  Wifi,
  MonitorPlay,
  ImageDown,
  RefreshCw,
  Video,
  Phone,
  MessageCircle,
  Clock,
  Droplets,
  Heart,
  Globe,
  Hospital,
  LayoutGrid,
  Languages,
  Wallet
} from 'lucide-react';

interface SidebarLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  /** Inline controls on the right of the page title (same row as title — not a separate app header) */
  topRight?: React.ReactNode;
  /** Tighter page padding and title block (e.g. dashboard) */
  dense?: boolean;
  /** Let content-heavy admin tools use the full available canvas */
  wide?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  roles: string[];
  /** When true, only exact pathname match (avoids /a matching /a/b) */
  exact?: boolean;
  children?: NavigationItem[];
}

function SidebarLayoutInner({ children, title, description, topRight, dense, wide }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t, translationsLoaded } = useTranslations();
  const { settings } = useSettings();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);

  const currentRole = session?.user?.role || 'doctor';
  const isAdmin = currentRole === 'admin';

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) {
        setUnreadNotifications(0);
        return;
      }
      const data = await res.json();
      setUnreadNotifications(typeof data.count === 'number' ? data.count : 0);
    } catch {
      setUnreadNotifications(null);
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchUnreadNotifications();
    window.addEventListener('qwesi:notifications-changed', fetchUnreadNotifications);
    return () => window.removeEventListener('qwesi:notifications-changed', fetchUnreadNotifications);
  }, [fetchUnreadNotifications, session?.user?.id]);

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const navigation: NavigationItem[] = [
    // Qwesi is virtual-only: no wards, labs, staff rosters or in-clinic billing.
    { id: 'dashboard', label: t('navigation.dashboard'), icon: Home, href: '/dashboard', roles: ['admin', 'doctor'] },

    // Admin
    { id: 'doctors', label: 'Doctors & herbalists', icon: UserPlus, href: '/doctors', roles: ['admin'] },
    { id: 'patients', label: t('navigation.patients'), icon: Users, href: '/patients', roles: ['admin', 'doctor'] },
    { id: 'appointments', label: t('navigation.appointments'), icon: Calendar, href: '/appointments', roles: ['admin', 'doctor'] },
    { id: 'payments', label: 'Payments', icon: Receipt, href: '/billing', roles: ['admin'] },
    { id: 'ai-doctor-settings', label: 'AI Doctor avatar', icon: Video, href: '/ai-doctor-settings', roles: ['admin'] },
    { id: 'finance', label: 'Payouts & refunds', icon: Wallet, href: '/finance', roles: ['admin'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytical-reports/financial', roles: ['admin'] },

    // Doctor / herbalist
    { id: 'appointment-slots', label: 'My availability', icon: LayoutGrid, href: '/appointments/slots', roles: ['doctor'] },
    { id: 'calendar', label: t('navigation.calendar'), icon: CalendarDays, href: '/calendar', roles: ['doctor'] },
    {
      id: 'telemedicine',
      label: 'Consultations',
      icon: Video,
      href: '/telemedicine',
      roles: ['doctor'],
      children: [
        { id: 'telemedicine-sessions', label: 'All sessions', icon: MessageCircle, href: '/telemedicine/sessions', roles: ['doctor'] },
        { id: 'telemedicine-waiting', label: 'Waiting room', icon: Clock, href: '/telemedicine/waiting-room', roles: ['doctor'] }
      ]
    },
    { id: 'clinical-notes', label: 'Consultation notes', icon: ClipboardList, href: '/clinical-notes', roles: ['doctor'] },
    { id: 'wallet', label: 'Earnings & wallet', icon: Wallet, href: '/wallet', roles: ['doctor'] },
    { id: 'my-fee', label: 'My fee & profile', icon: Stethoscope, href: '/profile', roles: ['doctor'] },

    // Pharmacy (e-prescriptions in, medicine out)
    { id: 'pharmacy-overview', label: 'Overview', icon: Home, href: '/pharmacy', exact: true, roles: ['pharmacy'] },
    { id: 'pharmacy-prescription-queue', label: 'E-prescriptions', icon: ClipboardList, href: '/pharmacy/prescription-queue', exact: true, roles: ['pharmacy'] },
    { id: 'pharmacy-orders', label: 'Orders', icon: ShoppingCart, href: '/pharmacy/orders', exact: true, roles: ['pharmacy'] },
    { id: 'pharmacy-inventory', label: 'Inventory', icon: Package, href: '/pharmacy/inventory', roles: ['pharmacy'] },
    { id: 'pharmacy-deliveries', label: 'Deliveries', icon: Truck, href: '/pharmacy/deliveries', exact: true, roles: ['pharmacy'] },
    { id: 'pharmacy-billing-wallet', label: 'Earnings & wallet', icon: Wallet, href: '/pharmacy/billing-wallet', exact: true, roles: ['pharmacy'] },
    { id: 'pharmacy-reports', label: 'Reports', icon: BarChart3, href: '/pharmacy/reports', exact: true, roles: ['pharmacy'] },
    { id: 'pharmacy-settings', label: 'Settings', icon: Settings, href: '/pharmacy/settings', exact: true, roles: ['pharmacy'] },

    // Everyone
    { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages', roles: ['admin', 'doctor', 'pharmacy'] },
    { id: 'notifications', label: t('navigation.notifications') || 'Notifications', icon: Bell, href: '/notifications', roles: ['admin', 'doctor'] },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', roles: ['admin'] },
  ].filter(item => {
    // Filter parent items
    if (!item.roles.includes(currentRole)) return false;
    // Filter children if they exist
    if (item.children) {
      item.children = item.children.filter(child => child.roles.includes(currentRole));
      // If no children remain and parent has no direct href functionality, we might want to hide it
      // But for billing, we want to show it even if user can't access service-items
    }
    return true;
  });

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  // Close profile menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (mobileProfileMenuRef.current && !mobileProfileMenuRef.current.contains(event.target as Node)) {
        setMobileProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isActiveRoute = (href: string, exact?: boolean) => {
    const [pathPart, queryPart = ''] = href.split('?');
    const hrefPath = pathPart || '/';
    const hrefQuery = new URLSearchParams(queryPart);

    if (hrefPath === '/') {
      return pathname === '/' && !queryPart;
    }

    const pathExact = pathname === hrefPath;
    const pathUnder = pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);

    // Appointments hub vs. /appointments/slots (separate nav item)
    if (hrefPath === '/appointments' && !queryPart && !exact) {
      if (pathname.startsWith('/appointments/slots')) return false;
    }

    let pathMatches: boolean;
    if (exact) {
      pathMatches = pathExact;
    } else if (queryPart) {
      // Filter links like /lab?status=pending — only the same path segment, not /lab/new
      pathMatches = pathExact;
    } else {
      pathMatches = pathUnder;
    }

    if (!pathMatches) return false;

    for (const [key, value] of hrefQuery.entries()) {
      if (searchParams.get(key) !== value) return false;
    }

    // Plain /lab list — not active when a status filter child is active
    if (hrefPath === '/lab' && !queryPart && pathExact && pathname === '/lab') {
      const st = searchParams.get('status');
      if (st === 'pending' || st === 'completed') return false;
    }

    return true;
  };

  // Auto-expand billing, reports, and lab menus if on their pages
  useEffect(() => {
    if (pathname.startsWith('/billing')) {
      setExpandedMenus(prev => new Set(prev).add('billing'));
    }
    if (pathname.startsWith('/analytical-reports')) {
      setExpandedMenus(prev => new Set(prev).add('analytical-reports'));
    }
    if (pathname.startsWith('/lab')) {
      setExpandedMenus(prev => new Set(prev).add('laboratory'));
    }
    if (pathname.startsWith('/pharmacy')) {
      setExpandedMenus(prev => new Set(prev).add('pharmacy'));
    }
    if (pathname.startsWith('/documents')) {
      setExpandedMenus(prev => new Set(prev).add('documents'));
    }
    if (pathname.startsWith('/telemedicine')) {
      setExpandedMenus(prev => new Set(prev).add('telemedicine'));
    }
  }, [pathname]);

  // Show loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading translations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col bg-white shadow-xl shadow-brand-900/10 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-brand-100">
          <LogoLink href="/dashboard" className="h-7" priority />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          {/* Navigation Menu */}
          <nav className="px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus.has(item.id);
            const isActive =
              isActiveRoute(item.href, item.exact) ||
              (hasChildren &&
                item.children?.some((child) => isActiveRoute(child.href, child.exact)));

            return (
              <div key={item.id}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.id)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                          : 'text-gray-700 hover:bg-brand-50 hover:text-brand-800'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && hasChildren && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children?.map((child) => (
                          <Link
                            key={child.id}
                            href={child.href}
                            className={`
                              flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                              ${isActiveRoute(child.href, child.exact)
                                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                                : 'text-gray-600 hover:bg-brand-50 hover:text-brand-800'
                              }
                            `}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
            <Link
              href={item.href}
              className={`
                flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                  : 'text-gray-700 hover:bg-brand-50 hover:text-brand-800'
                }
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
                )}
              </div>
            );
          })}
          </nav>

        {/* General Settings - Admin Only */}
        {isAdmin && (
          <div className="px-3 py-4 border-t border-brand-100">
            <div className="space-y-1">
              <Link
                href="/settings"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveRoute('/settings', true)
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-gray-700 hover:bg-brand-50 hover:text-brand-800'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="h-4 w-4 text-gray-600" />
                <span>{t('settings.title')}</span>
              </Link>
              <Link
                href="/settings/hospital-website"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveRoute('/settings/hospital-website', true)
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-gray-700 hover:bg-brand-50 hover:text-brand-800'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Globe className="h-4 w-4 text-teal-600" />
                <span>{t('settings.hospitalWebsite')}</span>
              </Link>
              <Link
                href="/settings/ai-chat"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveRoute('/settings/ai-chat', true)
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-gray-700 hover:bg-brand-50 hover:text-brand-800'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <MessageCircle className="h-4 w-4 text-cyan-600" />
                <span>AI Chat Settings</span>
              </Link>
              <Link
                href="/settings/notifications"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveRoute('/settings/notifications', true)
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-gray-700 hover:bg-brand-50 hover:text-brand-800'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Bell className="h-4 w-4 text-blue-600" />
                <span>{t('settings.notifications') || 'Notification Settings'}</span>
              </Link>
              <Link
                href="/settings/languages"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveRoute('/settings/languages', true)
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-gray-700 hover:bg-brand-50 hover:text-brand-800'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Languages className="h-4 w-4 text-indigo-600" />
                <span>{t('settings.languages')}</span>
              </Link>
              <Link
                href="/ai-settings"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveRoute('/ai-settings', true)
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-gray-700 hover:bg-brand-50 hover:text-brand-800'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="h-4 w-4 text-purple-600" />
                <span>{t('navigation.aiSettings')}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-3 py-4 border-t border-brand-100">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 px-3">
            {t('ai.quickActions.title')}
          </h3>
          <div className="space-y-1">
            {currentRole === 'pharmacy' ? (
              <>
                <Link
                  href="/pharmacy/medicines/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Plus className="h-4 w-4 text-brand-600" />
                  <span>Add Medicine</span>
                </Link>
                <Link
                  href="/pharmacy/dispensing"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  <span>Dispensing</span>
                </Link>
                <Link
                  href="/pharmacy/inventory"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Package className="h-4 w-4 text-brand-600" />
                  <span>Inventory</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/patients/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>{t('ai.quickActions.newPatient')}</span>
                </Link>
                <Link
                  href="/appointments/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Plus className="h-4 w-4 text-brand-600" />
                  <span>{t('ai.quickActions.newAppointment')}</span>
                </Link>
                {isAdmin && (
                  <>
                    <Link
                      href="/doctors/new"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <UserPlus className="h-4 w-4 text-purple-600" />
                      <span>{t('ai.quickActions.newDoctor')}</span>
                    </Link>
                    <Link
                      href="/pharmacy"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Pill className="h-4 w-4 text-brand-600" />
                      <span>Pharmacy</span>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 min-w-0 flex-col lg:ml-64">
        {/* Top navbar: notifications, language, profile */}
        <TopNavbar onMenu={() => setSidebarOpen(true)} profileHref="/profile" />

        {/* Page Content */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={
              dense
                ? `${wide ? 'max-w-none' : 'max-w-7xl'} mx-auto px-3 sm:px-4 lg:px-6 py-3`
                : `${wide ? 'max-w-none' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-6`
            }
          >
            {/* Page title row (optional topRight: language, notifications, logout — no extra header bar) */}
            <div className={`print:hidden ${dense ? 'mb-4' : 'mb-8'}`}>
              <div
                className={
                  dense
                    ? 'flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3'
                    : 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'
                }
              >
                <div className="min-w-0 flex-1">
                  <h2 className={dense ? 'text-xl font-bold text-gray-900' : 'text-2xl font-bold text-gray-900'}>
                    {title}
                  </h2>
                  {description && (
                    <p className={dense ? 'mt-0.5 text-sm text-gray-600' : 'mt-1 text-gray-700'}>{description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SidebarLayout(props: SidebarLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-gray-50">
          <div className="flex w-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <SidebarLayoutInner {...props} />
    </Suspense>
  );
}
