'use client';

import { useFlashToast } from '@/lib/useFlashToast';
import { Logo } from '@/app/components/logo';
import { useEffect, useState } from 'react';
import { getSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';

/**
 * Private administrator sign-in. It is not linked anywhere on the public site —
 * only people who know this address can reach it — and it only lets accounts
 * with the admin role through.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  useFlashToast(error);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      if (s?.user?.role === 'admin') router.replace('/dashboard');
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        setError('Invalid email or password');
        return;
      }
      const session = await getSession();
      if (session?.user?.role !== 'admin') {
        // The password was correct, but this account is not an administrator.
        const found = session?.user?.role || 'unknown';
        await signOut({ redirect: false });
        setError(`Signed in, but this account's role is "${found}", not "admin". Ask the site owner to set the role to admin.`);
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="qw-hero-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-strong hero-in w-full max-w-sm rounded-3xl p-6 sm:p-8">
        <div className="text-center">
          <div className="flex justify-center"><Logo className="h-9" priority /></div>
          <h1 className="font-display mt-5 text-2xl font-semibold text-brand-950">Administrator</h1>
          <p className="mt-1 text-sm text-gray-600">Authorised access only.</p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-base focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-11 text-base focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button disabled={loading} className="h-12 w-full rounded-full bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
