'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CalendarCheck, CheckCircle2, Coins, CreditCard, ReceiptText, ShieldCheck, Stethoscope } from 'lucide-react';
import { notifyError, notifySuccess } from '@/lib/notify';

const PRESETS = [10, 20, 50, 100];
const MIN_TOPUP = 10;
const CREDITS_PER_UNIT = 10; // GH₵10 or $10 = 100 credits

export default function PatientPaymentsPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<'GHS' | 'USD'>('GHS');
  const [balanceError, setBalanceError] = useState('');
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const sym = currency === 'USD' ? '$' : 'GH₵';

  const loadBalance = async () => {
    try {
      const r = await fetch('/api/ai-doctor/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.success !== false) {
        setBalance(Number(d.balance ?? 0));
        if (d.currency === 'USD' || d.currency === 'GHS') setCurrency(d.currency);
        setBalanceError('');
      } else {
        setBalanceError(d.error || 'Could not load your credits.');
      }
    } catch {
      setBalanceError('Could not load your credits.');
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadHistory = async () => {
    const r = await fetch('/api/patient-portal/subscriptions').catch(() => null);
    if (r?.ok) setHistory((await r.json()).transactions || []);
  };

  useEffect(() => { loadBalance(); loadHistory(); }, []);

  // Returning from Paystack after paying for a consultation
  useEffect(() => {
    if (!reference) return;
    (async () => {
      const r = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      if (r?.ok) { notifySuccess('Payment confirmed.'); loadHistory(); } else notifyError(d?.error || 'We could not confirm that payment.');
    })();
  }, [reference]);

  const topUp = async (amount: number) => {
    if (amount < MIN_TOPUP) return notifyError(`The minimum top-up is ${sym}${MIN_TOPUP}.`);
    setBusy(true);
    try {
      const r = await fetch('/api/ai-doctor/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || 'Could not start the payment.');
      window.location.href = d.url;
    } catch (e: any) {
      notifyError(e.message || 'Could not start the payment.');
      setBusy(false);
    }
  };

  const customAmount = Math.floor(Number(custom));
  const card = 'rounded-2xl border border-brand-100 bg-white/90 p-5 shadow-sm';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold text-brand-950 sm:text-3xl">Credits &amp; payments</h1>
        <p className="mt-1 text-sm text-gray-600">Credits power your Qwesi AI doctor on the website and WhatsApp. Doctor and herbalist consultations are paid for one at a time.</p>
      </header>

      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-5 text-white shadow-lg sm:p-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold"><Coins className="h-3.5 w-3.5" /> Qwesi AI credits</p>
        {loadingBalance ? (
          <div className="mt-4 h-12 w-40 animate-pulse rounded-lg bg-white/20" />
        ) : balance !== null ? (
          <>
            <p className="mt-3 text-5xl font-bold tracking-tight">{balance.toLocaleString()}</p>
            <p className="mt-1 text-sm text-brand-100">credits left · a simple question uses 5, a health question uses 10</p>
          </>
        ) : (
          <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
            {balanceError}{' '}
            <Link href="/patient-portal/profile" className="font-semibold underline">Open my profile</Link>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-950">Top up credits</h2>
        <p className="mt-1 text-sm text-gray-600">{sym}10 gives you 100 credits. The minimum top-up is {sym}{MIN_TOPUP}.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRESETS.map((a) => (
            <button key={a} type="button" disabled={busy || balance === null} onClick={() => topUp(a)}
              className="rounded-xl border border-brand-200 bg-white px-3 py-3 text-center transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50">
              <span className="block text-lg font-bold text-brand-800">{sym}{a}</span>
              <span className="block text-xs text-gray-500">{(a * CREDITS_PER_UNIT).toLocaleString()} credits</span>
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); topUp(customAmount); }} className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white px-3 focus-within:border-brand-500">
            <span className="text-gray-500">{sym}</span>
            <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="Other amount"
              className="w-32 bg-transparent px-2 text-base outline-none" />
          </div>
          <button type="submit" disabled={busy || balance === null || !custom}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            <CreditCard className="h-4 w-4" /> {busy ? 'Opening checkout…' : 'Pay securely'}
          </button>
          {customAmount >= MIN_TOPUP && <span className="text-sm text-gray-600">= {(customAmount * CREDITS_PER_UNIT).toLocaleString()} credits</span>}
        </form>
        {currency === 'USD' && <p className="mt-3 text-xs text-gray-500">Prices are shown in US dollars. Your card is charged in Ghana cedis at the current rate.</p>}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout by Paystack: card or mobile money.</p>
      </section>

      <section className={card}>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700"><Stethoscope className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-950">Paying for a doctor or herbalist</h2>
            <p className="mt-1 text-sm text-gray-600">There are no monthly plans. Every doctor and herbalist sets their own fee, shown on their profile before you book, and you pay only for the consultation you book.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
              {['See the fee up front, with no surprises at checkout', 'Pay securely with card or mobile money to confirm your slot', 'Missed or unfair consultation? Ask for a refund under “Refunds & problems”'].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{t}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/patient-portal/doctors" className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Find a doctor <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/patient-portal/appointments" className="inline-flex h-10 items-center gap-2 rounded-full border border-brand-200 px-5 text-sm font-semibold text-brand-800 hover:bg-brand-50"><CalendarCheck className="h-4 w-4" /> My appointments</Link>
            </div>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-gray-500" /><h2 className="text-base font-semibold text-gray-900">Recent payments</h2></div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead><tr className="text-left text-xs uppercase text-gray-500"><th className="py-2 pr-4">Reference</th><th className="py-2 pr-4">For</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-gray-500">No payments yet.</td></tr>
              ) : history.map((tx) => (
                <tr key={tx._id}>
                  <td className="py-2 pr-4 font-mono text-xs text-gray-600">{tx.reference}</td>
                  <td className="py-2 pr-4 text-gray-900">{tx.itemName}</td>
                  <td className="py-2 pr-4 text-gray-700">{tx.currency} {tx.amount}</td>
                  <td className="py-2 pr-4 capitalize text-gray-700">{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
