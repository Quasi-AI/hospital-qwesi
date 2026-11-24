'use client';

import { useFlashToast } from '@/lib/useFlashToast';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LogoLink } from '@/app/components/logo';

export function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [info, setInfo] = useState<{ name?: string; phone?: string }>({});
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  useFlashToast(error);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => { if (d.valid) { setInfo(d); setState('ready'); } else setState('invalid'); })
      .catch(() => setState('invalid'));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || 'Could not set password.');
    setState('done');
  };

  const field = 'h-12 w-full rounded-xl border border-brand-200 bg-white/80 px-4 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

  return (
    <div className="qw-card w-full max-w-md p-6 sm:p-8">
      <div className="mb-6"><LogoLink className="h-8" priority /></div>
      {state === 'checking' && <p className="text-gray-600">Checking your link…</p>}
      {state === 'invalid' && (
        <>
          <h1 className="font-display text-2xl font-semibold text-brand-950">Link not valid</h1>
          <p className="mt-2 text-gray-600">This link has expired or was already used. Ask for a new one.</p>
          <Link href="/forgot-password" className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-600 px-6 font-semibold text-white">Get a new link</Link>
        </>
      )}
      {state === 'ready' && (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-brand-950">Choose a new password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Hello{info.name ? `, ${info.name}` : ''}. Choose a new password for your account.
            </p>
          </div>
          <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          <input type="password" autoComplete="new-password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
          <button disabled={busy} className="h-12 w-full rounded-full bg-brand-600 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
      {state === 'done' && (
        <>
          <h1 className="font-display text-2xl font-semibold text-brand-950">Password changed</h1>
          <p className="mt-2 text-gray-600">You can now log in with your new password.</p>
          <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-600 px-6 font-semibold text-white">Log in</Link>
        </>
      )}
    </div>
  );
}
