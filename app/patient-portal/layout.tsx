'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from '../hooks/useTranslations';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { 
  Home,
  Calendar,
  FileText,
  ClipboardList,
  Pill,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Heart,
  Stethoscope,
  Video,
  Activity,
  MessageCircle
} from 'lucide-react';

interface PatientPortalLayoutProps {
  children: React.ReactNode;
}

export default function PatientPortalLayout({ children }: PatientPortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, translationsLoaded } = useTranslations();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);

  // Redirect non-patients to main dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'patient') {
      router.push('/');
    }
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, session, router]);

  const navigation = [
    { id: 'dashboard', label: t('patientPortal.navigation.dashboard'), icon: Home, href: '/patient-portal' },
    { id: 'appointments', label: t('patientPortal.navigation.appointments'), icon: Calendar, href: '/patient-portal/appointments' },
    { id: 'telemedicine', label: t('patientPortal.navigation.telemedicine') || 'Video Consultations', icon: Video, href: '/patient-portal/telemedicine' },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope, href: '/patient-portal/doctors' },
    { id: 'vitals', label: 'Vitals', icon: Activity, href: '/patient-portal/vitals' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/patient-portal/messages' },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, href: '/patient-portal/subscriptions' },
    { id: 'reports', label: t('patientPortal.navigation.reports'), icon: FileText, href: '/patient-portal/reports' },
    { id: 'ai-insights', label: t('patientPortal.navigation.aiInsights'), icon: Stethoscope, href: '/patient-portal/ai-insights' },
    { id: 'prescriptions', label: t('patientPortal.navigation.prescriptions'), icon: Pill, href: '/patient-portal/prescriptions' },
    { id: 'medical-records', label: t('patientPortal.navigation.medicalRecords'), icon: ClipboardList, href: '/patient-portal/medical-records' },
  ];

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

  const isActiveRoute = (href: string) => {
    if (href === '/patient-portal') {
      return pathname === '/patient-portal';
    }
    return pathname.startsWith(href);
  };

  // Show loading state
  if (!translationsLoaded || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render for non-patients
  if (session?.user?.role !== 'patient') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex w-64 max-h-screen flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-gradient-to-r from-teal-600 to-cyan-600 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-white">
                {t('patientPortal.title')}
              </h1>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all
                ${isActiveRoute(item.href)
                  ? 'bg-teal-100 text-teal-700 shadow-sm'
                  : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                }
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${isActiveRoute(item.href) ? 'text-teal-600' : 'text-gray-500'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Language Switcher */}
        <div className="shrink-0 border-t border-gray-200 px-2.5 py-3">
          <div className="px-2">
            <LanguageSwitcher />
          </div>
        </div>

        {/* User Profile */}
        <div className="shrink-0 border-t border-gray-200 px-2.5 py-3">
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-teal-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-white">
                {session?.user?.name?.charAt(0) || 'P'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{session?.user?.name || 'Patient'}</p>
                <p className="truncate text-xs text-teal-700">{session?.user?.patientId || session?.user?.role || 'Patient'}</p>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="py-1">
                  <div className="border-b border-gray-100 px-4 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">{session?.user?.name || 'Patient'}</p>
                    <p className="truncate text-xs text-gray-500">{session?.user?.email}</p>
                  </div>
                  <Link
                    href="/patient-portal/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>{t('patientPortal.navigation.profile')}</span>
                  </Link>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      signOut({ callbackUrl: '/login' });
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
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

      {/* Main Content */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Mobile Header */}
        <header className="border-b border-gray-200 bg-white shadow-sm lg:hidden">
          <div className="flex h-12 items-center justify-between px-3 sm:px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <div className="relative" ref={mobileProfileMenuRef}>
                <button
                  onClick={() => setMobileProfileMenuOpen(!mobileProfileMenuOpen)}
                  className="flex items-center gap-1.5 p-1.5 text-gray-600 hover:text-teal-600"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-white">
                    {session?.user?.name?.charAt(0) || 'P'}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${mobileProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {mobileProfileMenuOpen && (
                  <div className="absolute right-0 z-50 mt-1.5 w-52 rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="py-0.5">
                      <div className="border-b border-gray-200 px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'Patient'}</p>
                        <p className="text-xs text-gray-500">{session?.user?.email}</p>
                        <p className="mt-0.5 text-xs text-teal-600">{session?.user?.patientId}</p>
                      </div>
                      <Link
                        href="/patient-portal/profile"
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                        onClick={() => setMobileProfileMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        <span>{t('patientPortal.navigation.profile')}</span>
                      </Link>
                      <button
                        onClick={() => {
                          setMobileProfileMenuOpen(false);
                          signOut({ callbackUrl: '/login' });
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
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
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
