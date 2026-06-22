'use client';

import { useCallback, useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
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
    { id: 'dashboard', label: t('navigation.dashboard'), icon: Home, href: '/dashboard', roles: ['admin', 'doctor', 'staff', 'nurse'] },
    { id: 'hospital-portal', label: 'Hospital Portal', icon: Building2, href: '/hospital-portal', roles: ['admin', 'hospital'] },
    { id: 'hospital-network', label: 'Hospital Network', icon: Hospital, href: '/hospital-network', roles: ['admin', 'hospital'] },
    { id: 'doctors', label: t('navigation.doctors'), icon: UserPlus, href: '/doctors', roles: ['admin'] },
    { id: 'staff', label: t('navigation.staff'), icon: UserCheck, href: '/staff', roles: ['admin'] },
    { id: 'patients', label: t('navigation.patients'), icon: Users, href: '/patients', roles: ['admin', 'doctor', 'staff', 'nurse', 'hospital'] },
    { id: 'appointments', label: t('navigation.appointments'), icon: Calendar, href: '/appointments', roles: ['admin', 'doctor', 'staff', 'nurse', 'hospital'] },
    { id: 'appointment-slots', label: t('navigation.appointmentSlots'), icon: LayoutGrid, href: '/appointments/slots', roles: ['admin', 'doctor', 'staff', 'nurse'] },
    { id: 'calendar', label: t('navigation.calendar'), icon: CalendarDays, href: '/calendar', roles: ['admin', 'doctor', 'staff', 'nurse'] },
    { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages', roles: ['admin', 'doctor', 'staff', 'nurse', 'hospital', 'pharmacy'] },
    { id: 'clinical-notes', label: 'Notes', icon: ClipboardList, href: '/clinical-notes', roles: ['admin', 'doctor', 'staff', 'nurse'] },
    { 
      id: 'laboratory', 
      label: t('navigation.laboratory'), 
      icon: FlaskConical, 
      href: '/lab', 
      roles: ['admin', 'doctor', 'staff', 'nurse'],
      children: [
        { id: 'lab-tests', label: t('lab.tests'), icon: TestTube, href: '/lab', roles: ['admin', 'doctor', 'staff'] },
        { id: 'lab-new-order', label: t('lab.newTestOrder'), icon: Plus, href: '/lab/new', roles: ['admin', 'doctor', 'staff'] },
        { id: 'lab-pending', label: t('lab.pendingTests'), icon: ClipboardList, href: '/lab?status=pending', roles: ['admin', 'doctor', 'staff'] },
        { id: 'lab-results', label: t('lab.completedResults'), icon: ClipboardCheck, href: '/lab?status=completed', roles: ['admin', 'doctor', 'staff'] },
        { id: 'lab-incoming', label: t('lab.incomingResults') || 'Incoming Results', icon: Wifi, href: '/lab/incoming', roles: ['admin', 'staff'] },
        { id: 'lab-devices', label: t('lab.connectedDevices') || 'Connected Devices', icon: Cpu, href: '/lab/devices', roles: ['admin'] }
      ]
    },
    { 
      id: 'inpatient', 
      label: t('navigation.inpatient'), 
      icon: Building2, 
      href: '/inpatient/admissions', 
      roles: ['admin', 'staff', 'nurse', 'hospital'],
      children: [
        { id: 'admissions', label: t('inpatient.admissions'), icon: HeartPulse, href: '/inpatient/admissions', roles: ['admin', 'staff', 'hospital'] },
        { id: 'new-admission', label: t('inpatient.newAdmission'), icon: UserPlus, href: '/inpatient/admissions/new', roles: ['admin', 'staff', 'hospital'] },
        { id: 'wards', label: t('inpatient.wards'), icon: Building2, href: '/inpatient/wards', roles: ['admin', 'staff', 'hospital'] },
        { id: 'beds', label: t('inpatient.beds'), icon: Bed, href: '/inpatient/beds', roles: ['admin', 'staff', 'hospital'] }
      ]
    },
    { 
      id: 'radiology', 
      label: t('navigation.radiology'), 
      icon: Radio, 
      href: '/radiology', 
      roles: ['admin', 'doctor', 'staff', 'nurse'],
      children: [
        { id: 'radiology-studies', label: t('radiology.studies'), icon: Image, href: '/radiology', roles: ['admin', 'doctor', 'staff'] },
        { id: 'radiology-new', label: t('radiology.newStudy'), icon: Plus, href: '/radiology/new', roles: ['admin', 'doctor', 'staff'] },
        { id: 'imaging-incoming', label: t('imaging.incomingImages') || 'Incoming Images', icon: ImageDown, href: '/imaging/incoming', roles: ['admin', 'staff'] },
        { id: 'imaging-devices', label: t('imaging.connectedDevices') || 'Imaging Devices', icon: MonitorPlay, href: '/imaging/devices', roles: ['admin'] }
      ]
    },
    { 
      id: 'pharmacy', 
      label: t('navigation.pharmacy'), 
      icon: Pill, 
      href: '/pharmacy', 
      roles: ['admin', 'doctor', 'staff', 'nurse', 'pharmacy'],
      children: [
        { id: 'pharmacy-dashboard', label: 'Directory', icon: Home, href: '/pharmacy', exact: true, roles: ['admin', 'doctor', 'staff', 'nurse', 'pharmacy'] },
        { id: 'pharmacy-prescription-queue', label: 'Prescription Queue', icon: ClipboardList, href: '/pharmacy/prescription-queue', exact: true, roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-clinical-verification', label: 'Clinical Verification', icon: Shield, href: '/pharmacy/clinical-verification', exact: true, roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-orders', label: 'Orders', icon: ShoppingCart, href: '/pharmacy/orders', exact: true, roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-inventory', label: 'Inventory', icon: Package, href: '/pharmacy/inventory', roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-substitutions', label: 'Substitutions', icon: RefreshCw, href: '/pharmacy/substitutions', exact: true, roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-chronic-refills', label: 'Chronic Refills', icon: Clock, href: '/pharmacy/chronic-refills', exact: true, roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-deliveries', label: 'Deliveries', icon: Truck, href: '/pharmacy/deliveries', exact: true, roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-messages', label: 'Messages', icon: MessageCircle, href: '/pharmacy/messages', exact: true, roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-billing-wallet', label: 'Billing & Wallet', icon: Wallet, href: '/pharmacy/billing-wallet', exact: true, roles: ['admin', 'pharmacy'] },
        { id: 'pharmacy-reports', label: 'Reports', icon: BarChart3, href: '/pharmacy/reports', exact: true, roles: ['admin', 'staff', 'pharmacy'] },
        { id: 'pharmacy-compliance-logs', label: 'Compliance Logs', icon: FileText, href: '/pharmacy/compliance-logs', exact: true, roles: ['admin', 'pharmacy'] },
        { id: 'pharmacy-settings', label: 'Settings', icon: Settings, href: '/pharmacy/settings', exact: true, roles: ['admin', 'pharmacy'] }
      ]
    },
    { 
      id: 'inventory', 
      label: t('navigation.inventory'), 
      icon: Package, 
      href: '/inventory', 
      roles: ['admin', 'staff'],
      children: [
        { id: 'inventory-items', label: t('inventory.items'), icon: Package, href: '/inventory', roles: ['admin', 'staff'] },
        { id: 'inventory-new', label: t('inventory.addItem'), icon: Plus, href: '/inventory/items/new', roles: ['admin', 'staff'] },
        { id: 'inventory-suppliers', label: t('inventory.suppliers'), icon: Truck, href: '/inventory/suppliers', roles: ['admin', 'staff'] },
        { id: 'inventory-orders', label: t('inventory.purchaseOrders'), icon: ShoppingCart, href: '/inventory/purchase-orders', roles: ['admin', 'staff'] }
      ]
    },
    { id: 'medical-reports', label: t('navigation.medicalReports'), icon: FileText, href: '/reports', roles: ['admin', 'doctor', 'staff'] },
    { 
      id: 'documents', 
      label: t('navigation.documents'), 
      icon: FolderOpen, 
      href: '/documents', 
      roles: ['admin', 'doctor', 'staff'],
      children: [
        { id: 'documents-list', label: t('documents.title'), icon: Files, href: '/documents', roles: ['admin', 'doctor', 'staff'] },
        { id: 'documents-new', label: t('documents.addNew'), icon: FilePlus, href: '/documents/new', roles: ['admin', 'doctor', 'staff'] }
      ]
    },
    { 
      id: 'emergency', 
      label: t('navigation.emergency'), 
      icon: Siren, 
      href: '/emergency', 
      roles: ['admin', 'staff'],
      children: [
        { id: 'emergency-cases', label: t('emergency.title'), icon: AlertTriangle, href: '/emergency', roles: ['admin', 'staff'] },
        { id: 'emergency-new', label: t('emergency.newCase'), icon: Ambulance, href: '/emergency/new', roles: ['admin', 'staff'] }
      ]
    },
    { 
      id: 'telemedicine', 
      label: t('navigation.telemedicine') || 'Telemedicine', 
      icon: Video, 
      href: '/telemedicine', 
      roles: ['admin', 'doctor', 'staff'],
      children: [
        { id: 'telemedicine-dashboard', label: t('telemedicine.dashboard') || 'Dashboard', icon: Video, href: '/telemedicine', roles: ['admin', 'doctor', 'staff'] },
        { id: 'telemedicine-sessions', label: t('telemedicine.sessions') || 'All Sessions', icon: MessageCircle, href: '/telemedicine/sessions', roles: ['admin', 'doctor', 'staff'] },
        { id: 'telemedicine-new', label: t('telemedicine.newSession') || 'New Session', icon: Plus, href: '/telemedicine/sessions/new', roles: ['admin', 'doctor', 'staff'] },
        { id: 'telemedicine-waiting', label: t('telemedicine.waitingRoom') || 'Waiting Room', icon: Clock, href: '/telemedicine/waiting-room', roles: ['admin', 'doctor', 'staff'] }
      ]
    },
    { 
      id: 'ambulance', 
      label: t('navigation.ambulance'), 
      icon: Ambulance, 
      href: '/ambulance', 
      roles: ['admin', 'staff'],
      children: [
        { id: 'ambulance-bookings', label: t('ambulance.title'), icon: Ambulance, href: '/ambulance', roles: ['admin', 'staff'] },
        { id: 'ambulance-new', label: t('ambulance.newBooking'), icon: Plus, href: '/ambulance/bookings/new', roles: ['admin', 'staff'] },
        { id: 'ambulance-fleet', label: t('ambulance.fleetManagement'), icon: Truck, href: '/ambulance/fleet', roles: ['admin', 'staff'] }
      ]
    },
    { 
      id: 'blood-bank', 
      label: t('navigation.bloodBank') || 'Blood Bank', 
      icon: Droplets, 
      href: '/blood-bank', 
      roles: ['admin', 'staff'],
      children: [
        { id: 'blood-bank-dashboard', label: t('bloodBank.dashboard') || 'Dashboard', icon: Droplets, href: '/blood-bank', roles: ['admin', 'staff'] },
        { id: 'blood-bank-inventory', label: t('bloodBank.inventory') || 'Inventory', icon: Package, href: '/blood-bank/inventory', roles: ['admin', 'staff'] },
        { id: 'blood-bank-donors', label: t('bloodBank.donors') || 'Donors', icon: Heart, href: '/blood-bank/donors', roles: ['admin', 'staff'] },
        { id: 'blood-bank-transfusions', label: t('bloodBank.transfusions') || 'Transfusions', icon: Activity, href: '/blood-bank/transfusions', roles: ['admin', 'staff'] },
        { id: 'blood-bank-new-request', label: t('bloodBank.newRequest') || 'New Request', icon: Plus, href: '/blood-bank/transfusions/new', roles: ['admin', 'staff'] }
      ]
    },
    { 
      id: 'analytical-reports', 
      label: t('navigation.analyticalReports'), 
      icon: BarChart3, 
      href: '/analytical-reports', 
      roles: ['admin', 'doctor', 'staff'],
      children: [
        { id: 'financial-reports', label: t('navigation.financialReports'), icon: DollarSign, href: '/analytical-reports/financial', roles: ['admin', 'doctor', 'staff'] },
        { id: 'clinical-analytics', label: t('navigation.clinicalAnalytics'), icon: Activity, href: '/analytical-reports/clinical', roles: ['admin', 'doctor', 'staff'] },
        { id: 'operational-analytics', label: t('navigation.operationalAnalytics'), icon: LineChart, href: '/analytical-reports/operational', roles: ['admin', 'doctor', 'staff'] },
        { id: 'performance-reports', label: t('navigation.performanceReports'), icon: Target, href: '/analytical-reports/performance', roles: ['admin', 'doctor'] },
        { id: 'patient-analytics', label: t('navigation.patientAnalytics'), icon: Users, href: '/analytical-reports/patient', roles: ['admin', 'doctor', 'staff'] },
        { id: 'appointment-analytics', label: t('navigation.appointmentAnalytics'), icon: Calendar, href: '/analytical-reports/appointment', roles: ['admin', 'doctor', 'staff'] }
      ]
    },
    { 
      id: 'billing', 
      label: t('navigation.billing'), 
      icon: Receipt, 
      href: '/billing', 
      roles: ['admin', 'doctor', 'staff'],
      children: [
        { id: 'billing-home', label: t('billing.title'), icon: Receipt, href: '/billing', roles: ['admin', 'doctor', 'staff'] },
        { id: 'billing-new', label: t('billing.addNewInvoice'), icon: Plus, href: '/billing/invoices/new', roles: ['admin', 'doctor', 'staff'] },
        { id: 'service-items', label: t('navigation.serviceItems'), icon: List, href: '/billing/service-items', roles: ['admin', 'doctor', 'staff'] }
      ]
    },
    { id: 'notifications', label: t('navigation.notifications') || 'Notifications', icon: Bell, href: '/notifications', roles: ['admin', 'doctor', 'staff'] },
    { id: 'wallet', label: 'Wallet', icon: Wallet, href: '/wallet', roles: ['doctor', 'staff'] },
    { id: 'ai-treatment-recommendations', label: t('navigation.aiTreatmentRecommendations'), icon: Stethoscope, href: '/ai-treatment-recommendations', roles: ['admin', 'doctor', 'staff'] },
    { id: 'ai-drug-interaction', label: t('navigation.aiDrugInteraction'), icon: Pill, href: '/ai-drug-interaction', roles: ['admin', 'doctor', 'staff'] },
    { id: 'ai-medical-image', label: t('navigation.aiMedicalImage'), icon: Camera, href: '/ai-medical-image', roles: ['admin', 'doctor', 'staff'] },
    { id: 'ai-appointment-optimizer', label: t('navigation.aiAppointmentOptimizer'), icon: Calendar, href: '/ai-appointment-optimizer', roles: ['admin', 'doctor', 'staff'] },
    { id: 'ai-risk-assessment', label: t('navigation.aiRiskAssessment'), icon: Shield, href: '/ai-risk-assessment', roles: ['admin', 'doctor', 'staff'] },
    { id: 'ai-health-trends', label: t('navigation.aiHealthTrends'), icon: LineChart, href: '/ai-health-trends', roles: ['admin', 'doctor', 'staff'] },
    { id: 'ai-voice-input', label: t('navigation.aiVoiceInput'), icon: Mic, href: '/ai-voice-input', roles: ['admin', 'doctor', 'staff'] },
    { id: 'ai-health-analytics', label: t('navigation.aiHealthAnalytics'), icon: TrendingUp, href: '/ai-health-analytics', roles: ['admin', 'doctor', 'staff'] },
    { id: 'ai-assistant', label: t('navigation.aiAssistant'), icon: Stethoscope, href: '/ai-assistant', roles: ['admin', 'doctor', 'staff'] }
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
    if (pathname.startsWith('/radiology')) {
      setExpandedMenus(prev => new Set(prev).add('radiology'));
    }
    if (pathname.startsWith('/pharmacy')) {
      setExpandedMenus(prev => new Set(prev).add('pharmacy'));
    }
    if (pathname.startsWith('/inventory')) {
      setExpandedMenus(prev => new Set(prev).add('inventory'));
    }
    if (pathname.startsWith('/documents')) {
      setExpandedMenus(prev => new Set(prev).add('documents'));
    }
    if (pathname.startsWith('/emergency')) {
      setExpandedMenus(prev => new Set(prev).add('emergency'));
    }
    if (pathname.startsWith('/ambulance')) {
      setExpandedMenus(prev => new Set(prev).add('ambulance'));
    }
    if (pathname.startsWith('/blood-bank')) {
      setExpandedMenus(prev => new Set(prev).add('blood-bank'));
    }
    if (pathname.startsWith('/inpatient')) {
      setExpandedMenus(prev => new Set(prev).add('inpatient'));
    }
    if (pathname.startsWith('/telemedicine')) {
      setExpandedMenus(prev => new Set(prev).add('telemedicine'));
    }
    if (pathname.startsWith('/imaging')) {
      setExpandedMenus(prev => new Set(prev).add('radiology'));
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
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {settings?.systemTitle || ''}
              </h1>
              <p className="text-xs text-gray-700">
                {settings?.systemDescription || ''}
              </p>
            </div>
          </div>
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
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
          <div className="px-3 py-4 border-t border-gray-200">
            <div className="space-y-1">
              <Link
                href="/settings"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveRoute('/settings', true)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
        <div className="px-3 py-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 px-3">
            {t('ai.quickActions.title')}
          </h3>
          <div className="space-y-1">
            {currentRole === 'pharmacy' ? (
              <>
                <Link
                  href="/pharmacy/medicines/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Plus className="h-4 w-4 text-emerald-600" />
                  <span>Add Medicine</span>
                </Link>
                <Link
                  href="/pharmacy/dispensing"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  <span>Dispensing</span>
                </Link>
                <Link
                  href="/pharmacy/inventory"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Package className="h-4 w-4 text-amber-600" />
                  <span>Inventory</span>
                </Link>
              </>
            ) : currentRole === 'hospital' ? (
              <>
                <Link
                  href="/patients/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>{t('ai.quickActions.newPatient')}</span>
                </Link>
                <Link
                  href="/inpatient/admissions/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <HeartPulse className="h-4 w-4 text-red-600" />
                  <span>New Admission</span>
                </Link>
                <Link
                  href="/inpatient/beds"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Bed className="h-4 w-4 text-purple-600" />
                  <span>Beds</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/patients/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>{t('ai.quickActions.newPatient')}</span>
                </Link>
                <Link
                  href="/appointments/new"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Plus className="h-4 w-4 text-green-600" />
                  <span>{t('ai.quickActions.newAppointment')}</span>
                </Link>
                {isAdmin && (
                  <>
                    <Link
                      href="/doctors/new"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <UserPlus className="h-4 w-4 text-purple-600" />
                      <span>{t('ai.quickActions.newDoctor')}</span>
                    </Link>
                    <Link
                      href="/pharmacy"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Pill className="h-4 w-4 text-emerald-600" />
                      <span>Pharmacy</span>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Language Switcher */}
        <div className="px-3 py-4 border-t border-gray-200">
          <div className="px-3">
            <LanguageSwitcher />
          </div>
        </div>

        {/* User Profile */}
        <div className="px-3 py-4 border-t border-gray-200">
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {session?.user?.name?.charAt(0) || 'D'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || t('auth.doctor')}
                </p>
                <p className="text-xs text-gray-700">{session?.user?.role || t('auth.doctor')}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <Link
                    href="/profile"
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>{t('profile.profileSettings')}</span>
                  </Link>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      signOut({ callbackUrl: '/login' });
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('profile.logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 min-w-0 flex-col lg:ml-64">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <Link
                href="/notifications"
                className="relative p-2 text-gray-400 hover:text-gray-600"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications !== null && unreadNotifications > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold leading-none text-white">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
              <LanguageSwitcher />
              <div className="relative" ref={mobileProfileMenuRef}>
                <button
                  onClick={() => setMobileProfileMenuOpen(!mobileProfileMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-400 hover:text-gray-600"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {session?.user?.name?.charAt(0) || 'D'}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${mobileProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Mobile Profile Dropdown Menu */}
                {mobileProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{session?.user?.name || t('auth.doctor')}</p>
                        <p className="text-xs text-gray-600">{session?.user?.email || 'doctor@aidoc.com'}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setMobileProfileMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        <span>{t('profile.profileSettings')}</span>
                      </Link>
                      <button
                        onClick={() => {
                          setMobileProfileMenuOpen(false);
                          signOut({ callbackUrl: '/login' });
                        }}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t('profile.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
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
                {topRight && (
                  <div
                    className={
                      dense
                        ? 'hidden shrink-0 flex-wrap items-center justify-end gap-0 md:flex'
                        : 'hidden shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:flex'
                    }
                  >
                    {topRight}
                  </div>
                )}
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
