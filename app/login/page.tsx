'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Stethoscope,
  Building2,
  AlertCircle,
  CheckCircle,
  Copy,
  Crown,
  UserCheck,
  Heart,
  Pill
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
    { role: 'Admin', email: 'admin@aidoc.com', password: 'password123', icon: Crown, color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { role: 'Patient', email: 'patient@aidoc.com', password: 'password123', icon: Heart, color: 'bg-teal-50 text-teal-700 border-teal-100' },
    { role: 'Doctor', email: 'doctor@aidoc.com', password: 'password123', icon: Stethoscope, color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { role: 'Staff', email: 'staff@aidoc.com', password: 'password123', icon: UserCheck, color: 'bg-green-100 text-green-800 border-green-200' },
    { role: 'Hospital', email: 'hospital@aidoc.com', password: 'password123', icon: Building2, color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
    { role: 'Pharmacy', email: 'pharmacy@aidoc.com', password: 'password123', icon: Pill, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  ];

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push(getRoleHome(session.user?.role));
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

    if (!formData.email.includes('@')) {
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
        setError('Invalid email or password');
      } else {
        router.refresh();
        const session = await getSession();
        if (session?.user?.role === 'patient') {
          setSuccess('Login successful! Redirecting to patient portal...');
          router.push('/patient-portal');
        } else if (session?.user?.role === 'pharmacy') {
          setSuccess('Login successful! Redirecting to pharmacy dashboard...');
          router.push('/pharmacy');
        } else if (session?.user?.role === 'hospital') {
          setSuccess('Login successful! Redirecting to hospital dashboard...');
          router.push('/hospital-portal');
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className={`w-full ${isDemo ? 'max-w-6xl' : 'max-w-md'} space-y-5`}>
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <h2 className="mb-1 text-2xl font-bold text-gray-900">
            {t('login.subtitle')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('login.description')}
          </p>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className={`flex flex-col items-start justify-center gap-4 ${isDemo ? 'lg:flex-row' : ''}`}>
          {/* Login Form */}
          <div className={`rounded-lg border border-gray-100 bg-white p-5 shadow-lg ${isDemo ? 'max-w-md flex-1' : 'w-full'}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('login.email')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder={t('login.email')}
                    disabled={isLoading}
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-10 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder={t('login.password')}
                    disabled={isLoading}
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5"
                    disabled={isLoading}
                    suppressHydrationWarning
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                  <span className="text-sm text-green-700">{success}</span>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                suppressHydrationWarning
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    <span>{t('login.signingIn')}</span>
                  </div>
                ) : (
                  <span>{t('login.signIn')}</span>
                )}
              </button>
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-sm font-semibold text-amber-950">Need a doctor, nurse, staff, hospital, or pharmacy account?</p>
                <p className="mt-1 text-xs text-amber-800">Create an account here and wait for admin approval.</p>
                <Link
                  href="/signup"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Sign up for approval
                </Link>
              </div>
            </form>
          </div>

          {/* Demo Credentials Section - Right Side */}
          {isDemo && (
            <div className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 ${isDemo ? 'max-w-md flex-1' : 'w-full'}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-base font-semibold text-yellow-900">
                  <User className="h-4 w-4 shrink-0" />
                  Demo Credentials
                </h3>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-800 bg-yellow-200 sm:text-xs">
                  DEMO MODE
                </span>
              </div>
              <p className="mb-3 text-xs text-yellow-800 sm:text-sm">
                Click on any user card below to auto-fill credentials, or copy them to clipboard.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {demoUsers.map((user, index) => {
                  const Icon = user.icon;
                  return (
                    <div
                      key={index}
                      className={`cursor-pointer rounded-md border-2 p-3 transition-all hover:shadow-md ${user.color}`}
                      onClick={() => handleDemoLogin(user.email, user.password)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="shrink-0 rounded-md bg-white p-1.5">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{user.role}</p>
                            <p className="truncate text-xs opacity-80 sm:text-sm">{user.email}</p>
                            <p className="text-xs opacity-70">Password: {user.password}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCredentials(user.email, user.password);
                          }}
                          className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-white"
                          title="Copy credentials"
                        >
                          <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
    </div>
  );
}

function getRoleHome(role?: string | null) {
  if (role === 'patient') return '/patient-portal';
  if (role === 'pharmacy') return '/pharmacy';
  if (role === 'hospital') return '/hospital-portal';
  return '/dashboard';
}
