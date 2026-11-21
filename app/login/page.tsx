'use client';

import { LogoLink } from '@/app/components/logo';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn, getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Copy,
  Crown,
  UserCheck,
  Heart,
  Pill,
  ShieldCheck,
  CreditCard,
  Video
} from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';

export default function LoginPage() {
  const { t } = useTranslations();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const router = useRouter();

  const demoUsers = [
    { role: 'Patient', email: 'patient@aidoc.com', password: 'password123', icon: Heart, color: 'bg-teal-50 text-teal-700 border-teal-100' },
    { role: 'Doctor', email: 'doctor@aidoc.com', password: 'password123', icon: Stethoscope, color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { role: 'Staff', email: 'staff@aidoc.com', password: 'password123', icon: UserCheck, color: 'bg-green-100 text-green-800 border-green-200' },
    { role: 'Pharmacy', email: 'pharmacy@aidoc.com', password: 'password123', icon: Pill, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  ];

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push(safeNext(session.user?.role) || getRoleHome(session.user?.role));
      }
    };
    checkSession();

    // Check if demo mode is enabled
    const checkDemoMode = async () => {
      try {
        const response = await fetch('/api/demo-check');
        if (response.ok) {
          const data = await response.json();
          setIsDemo(data.isDemo || false);
        }
      } catch (error) {
        console.error('Error checking demo mode:', error);
      }
    };
    checkDemoMode();
  }, [router]);

  const handleDemoLogin = (email: string, password: string) => {
    setFormData({ email, password });
    setError('');
  };

  const copyCredentials = (email: string, password: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
    setSuccess('Credentials copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'PENDING_APPROVAL') {
          setError(
            'Your account is still pending admin approval. You\u2019ll be able to log in as soon as it\u2019s approved — no need to sign up again.'
          );
        } else {
          setError('Invalid email or password');
        }
      } else {
        router.refresh();
        const session = await getSession();
        if (session?.user?.role === 'admin') {
          // Administrators sign in through their own private page.
          await signOut({ redirect: false });
          setError('Invalid email or password');
          return;
        }
        if (session?.user?.role === 'patient') {
          setSuccess('Login successful! Redirecting...');
          router.push(safeNext('patient') || '/patient-portal');
        } else if (session?.user?.role === 'pharmacy') {
          setSuccess('Login successful! Redirecting to pharmacy dashboard...');
          router.push('/pharmacy');
        } else {
          setSuccess('Login successful! Redirecting to dashboard...');
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="qw-hero-bg relative hidden flex-col justify-between overflow-hidden text-white lg:flex">
        <div className="relative z-10 border-b border-brand-100 !bg-white px-12 py-4">
          <LogoLink className="h-8" priority />
        </div>
        <div className="px-12">
          <h1 className="font-display text-4xl font-semibold leading-tight xl:text-5xl">
            Your doctor is one <span className="text-accent-300">booking</span> away.
          </h1>
          <ul className="mt-8 space-y-4 text-lg text-white/80">
            <li className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-accent-300" /> Licence-verified doctors</li>
            <li className="flex items-start gap-3"><CreditCard className="mt-1 h-5 w-5 shrink-0 text-accent-300" /> Fees shown up front, pay securely to book</li>
            <li className="flex items-start gap-3"><Video className="mt-1 h-5 w-5 shrink-0 text-accent-300" /> Video, audio or chat from anywhere</li>
          </ul>
        </div>
        <p className="px-12 pb-8 text-sm text-white/50">Virtual care is not for emergencies.</p>
      </aside>

      {/* Form panel */}
      <main className="flex items-stretch justify-center sm:items-center sm:px-8 sm:py-10">
        <div className={`glass-strong w-full !rounded-none !border-0 px-5 pb-10 pt-8 !shadow-none sm:!rounded-3xl sm:!border sm:p-8 sm:!shadow-lg ${isDemo ? 'max-w-3xl' : 'max-w-md'}`}>
          <div className="mb-8 lg:hidden">
            <LogoLink className="h-9" priority />
          </div>

          <div className={`flex flex-col gap-6 ${isDemo ? 'lg:flex-row' : ''}`}>
            <div className="w-full flex-1">
              <h2 className="font-display text-3xl font-semibold text-gray-900">{t('login.subtitle')}</h2>
              <p className="mt-2 text-sm text-gray-600">{t('login.description')}</p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">{t('login.email')}</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="block h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-base transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                      placeholder={t('login.email')}
                      disabled={isLoading}
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">{t('login.password')}</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="block h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-11 text-base transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                      placeholder={t('login.password')}
                      disabled={isLoading}
                      suppressHydrationWarning
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={isLoading}
                      suppressHydrationWarning
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm text-green-700">{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-brand-600 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  suppressHydrationWarning
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                      {t('login.signingIn')}
                    </span>
                  ) : (
                    t('login.signIn')
                  )}
                </button>
              </form>

              <div className="mt-6 space-y-3">
                <Link
                  href="/signup/patient"
                  className="flex items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 p-4 transition hover:border-brand-400"
                >
                  <span>
                    <span className="block text-sm font-semibold text-brand-900">New patient?</span>
                    <span className="block text-xs text-brand-800/80">Create a free account to book a doctor.</span>
                  </span>
                  <span className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">Sign up</span>
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center justify-between rounded-2xl border border-accent-200 bg-accent-50 p-4 transition hover:border-accent-400"
                >
                  <span>
                    <span className="block text-sm font-semibold text-accent-700">Are you a doctor or herbalist?</span>
                    <span className="block text-xs text-accent-700/80">Join, set your own fee and start earning.</span>
                  </span>
                  <span className="rounded-full bg-accent-400 px-3 py-1.5 text-xs font-semibold text-brand-950">Join</span>
                </Link>
              </div>
            </div>

            {isDemo && (
              <div className="w-full flex-1 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-base font-semibold text-yellow-900">
                    <User className="h-4 w-4 shrink-0" /> Demo Credentials
                  </h3>
                  <span className="shrink-0 rounded bg-yellow-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-800">Demo mode</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {demoUsers.map((user, index) => {
                    const Icon = user.icon;
                    return (
                      <div
                        key={index}
                        className={`cursor-pointer rounded-xl border p-3 transition hover:shadow-md ${user.color}`}
                        onClick={() => handleDemoLogin(user.email, user.password)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="shrink-0 rounded-md bg-white p-1.5"><Icon className="h-4 w-4" /></div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{user.role}</p>
                              <p className="truncate text-xs opacity-80">{user.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); copyCredentials(user.email, user.password); }}
                            className="shrink-0 rounded-md p-1.5 hover:bg-white"
                            title="Copy credentials"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Safe in-app redirect target passed as ?next=/patient-portal/... */
function safeNext(role?: string | null) {
  if (typeof window === 'undefined' || role !== 'patient') return null;
  const next = new URLSearchParams(window.location.search).get('next') || '';
  return next.startsWith('/patient-portal') && !next.startsWith('//') ? next : null;
}

function getRoleHome(role?: string | null) {
  if (role === 'patient') return '/patient-portal';
  if (role === 'pharmacy') return '/pharmacy';
  return '/dashboard';
}
