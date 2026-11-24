'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogoLink } from '@/app/components/logo';
import { useFlashToast } from '@/lib/useFlashToast';

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useFlashToast(error);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) return setError('Enter your email or phone number.');
    setBusy(true);
    try {
      await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier }) });
      setDone(true);
    } catch {
      setError('Could not send the link. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'h-12 w-full rounded-xl border border-brand-200 bg-white/80 px-4 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';
  return (
    <div className="qw-card w-full max-w-md p-6 sm:p-8">
      <div className="mb-6"><LogoLink className="h-8" priority /></div>
      {done ? (
        <>
          <h1 className="font-display text-2xl font-semibold text-brand-950">Check your inbox</h1>
          <p className="mt-2 text-gray-600">If an account matches, we have sent a reset link by email (and on WhatsApp for patients). It works for 1 hour. Check your spam folder too.</p>
          <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-600 px-6 font-semibold text-white">Back to login</Link>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-brand-950">Forgot your password?</h1>
            <p className="mt-2 text-sm text-gray-600">Enter the email or phone number you signed up with. Works for patients, doctors, herbalists and pharmacies.</p>
          </div>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email or phone number" autoComplete="username" className={field} />
          <button disabled={busy} className="h-12 w-full rounded-full bg-brand-600 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <p className="text-center text-sm"><Link href="/login" className="font-medium text-brand-700 hover:underline">Back to login</Link></p>
        </form>
      )}
    </div>
  );
}
