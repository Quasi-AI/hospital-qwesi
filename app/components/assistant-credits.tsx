'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Coins, X, ExternalLink } from 'lucide-react';

async function creditApi(action: string, body?: any) {
  const res = await fetch(`/api/ai-doctor/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Credit balance + charging for staff using the AI assistant. Admins are never charged. */
export function useAssistantCredits() {
  const { data: session } = useSession();
  const exempt = session?.user?.role === 'admin';
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<'GHS' | 'USD'>('GHS');
  const [error, setError] = useState('');
  const [needTopUp, setNeedTopUp] = useState(false);

  const refresh = useCallback(async () => {
    if (exempt || !session?.user) return;
    const r = await creditApi('history');
    if (r.ok) {
      setBalance(r.data.balance ?? 0);
      if (r.data.currency) setCurrency(r.data.currency);
      setError('');
    } else setError(r.data.error || '');
  }, [exempt, session?.user]);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  /** Returns true when the question may go ahead (credits were deducted). */
  const charge = useCallback(async (text: string) => {
    if (exempt) return true;
    const r = await creditApi('charge', { text });
    if (r.ok) {
      setBalance(r.data.balance);
      setNeedTopUp(false);
      return true;
    }
    if (r.status === 402) {
      setBalance(r.data.balance ?? 0);
      if (r.data.currency) setCurrency(r.data.currency);
      setNeedTopUp(true);
    } else {
      setError(r.data.error || 'Could not check your credits.');
    }
    return false;
  }, [exempt]);

  return { exempt, balance, currency, error, needTopUp, setNeedTopUp, charge, refresh };
}

export function AssistantCreditsBar({ credits }: { credits: ReturnType<typeof useAssistantCredits> }) {
  const { exempt, balance, currency, error, needTopUp, setNeedTopUp } = credits;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const sym = currency === 'USD' ? '$' : 'GH₵';
  const show = open || needTopUp;
  if (exempt) return null;

  const pay = async () => {
    const value = custom ? Number(custom) : amount;
    if (!(value >= 1)) { setMsg('Enter an amount of at least 1.'); return; }
    setBusy(true); setMsg('');
    const r = await creditApi('topup', { amount: value });
    setBusy(false);
    if (r.ok && r.data.url) {
      window.open(r.data.url, '_blank', 'noopener');
      setMsg('Payment page opened. Come back here when you have paid — your balance updates automatically.');
    } else setMsg(r.data.error || 'Could not create a payment link.');
  };

  return (
    <div className="mb-4">
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${needTopUp ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-2 text-gray-800">
          <Coins className="h-4 w-4 text-violet-600" />
          <span className="font-semibold">{balance === null ? '…' : balance.toLocaleString()} credits</span>
          <span className="hidden text-xs text-gray-500 sm:inline">· 5 per question, 10 for health questions</span>
        </div>
        <button type="button" onClick={() => { setOpen(!open); setNeedTopUp(false); }} className="rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700">
          Buy credits
        </button>
      </div>
      {needTopUp && <p className="mt-1 text-xs font-medium text-amber-700">You are out of credits for this question. Buy credits to continue.</p>}
      {error && !needTopUp && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {show && (
        <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Buy AI credits</p>
            <button type="button" onClick={() => { setOpen(false); setNeedTopUp(false); }} aria-label="Close" className="text-gray-500 hover:text-gray-800"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-0.5 text-xs text-gray-600">{sym}1 = 10 credits. Pay securely with Paystack (mobile money or card).</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[5, 10, 20, 50].map((v) => (
              <button key={v} type="button" onClick={() => { setAmount(v); setCustom(''); }}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${!custom && amount === v ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-200 bg-white text-gray-800'}`}>
                {sym}{v} · {v * 10} credits
              </button>
            ))}
            <input type="number" min={1} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Other"
              className="h-8 w-20 rounded-md border border-gray-200 px-2 text-xs" />
            <button type="button" onClick={pay} disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {busy ? 'Opening…' : <>Pay <ExternalLink className="h-3 w-3" /></>}
            </button>
          </div>
          {msg && <p className="mt-2 text-xs text-gray-700">{msg}</p>}
        </div>
      )}
    </div>
  );
}
