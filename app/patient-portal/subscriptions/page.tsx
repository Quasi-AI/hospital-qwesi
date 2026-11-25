'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarCheck, CheckCircle2, Coins, CreditCard, FileText, ShieldCheck, Smartphone, Stethoscope } from 'lucide-react';
import { notifyError, notifySuccess } from '@/lib/notify';

const PRESETS = [10, 20, 50, 100];
const MIN_TOPUP = 10;
const CREDITS_PER_UNIT = 10; // 10 of the currency = 100 credits
const LOW_CREDITS = 20;

type Payment = {
  _id: string; reference: string; name: string; amount: number; currency: string; status: string; createdAt: string;
  doctorName: string | null; appointment: { id: string; date: string; time?: string; status: string } | null;
  paidNotBooked: boolean; refund: { status: string; amount: number | null } | null; payUrl: string | null;
};
type CreditRow = { type: 'purchased' | 'deducted' | 'refunded' | 'bonus'; credits: number; at: string; label: string; reference: string | null; paid: { amount: number; currency: string } | null };

const REFUND_LABEL: Record<string, string> = { pending_review: 'Refund under review', processed: 'Refunded', manual_required: 'Refund being processed', denied: 'Refund declined' };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function PatientPaymentsPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<'GHS' | 'USD'>('GHS');
  const [balanceError, setBalanceError] = useState('');
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [credits, setCredits] = useState<CreditRow[] | null>(null);
  const [tab, setTab] = useState<'all' | 'purchased' | 'deducted'>('all');
  const sym = currency === 'USD' ? '$' : 'GH₵';

  const loadCredits = async () => {
    try {
      const r = await fetch('/api/ai-doctor/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.success !== false) {
        setBalance(Number(d.balance ?? 0));
        if (d.currency === 'USD' || d.currency === 'GHS') setCurrency(d.currency);
        setCredits(Array.isArray(d.history) ? d.history : []);
        setBalanceError('');
      } else {
        setBalanceError(d.error || 'Could not load your credits.');
        setCredits([]);
      }
    } catch {
      setBalanceError('Could not load your credits.');
      setCredits([]);
    } finally {
      setLoadingBalance(false);
    }
  };
  const loadPayments = async () => {
    const r = await fetch('/api/patient-portal/payments', { cache: 'no-store' }).catch(() => null);
    setPayments(r?.ok ? (await r.json()).payments || [] : []);
  };
  useEffect(() => { loadCredits(); loadPayments(); }, []);

  // Returning from Paystack after paying for a consultation
  useEffect(() => {
    if (!reference) return;
    (async () => {
      const r = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      if (r?.ok) { notifySuccess('Payment confirmed.'); loadPayments(); } else notifyError(d?.error || 'We could not confirm that payment.');
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
  const low = balance !== null && balance < LOW_CREDITS;
  const rows = useMemo(() => (credits || []).filter((c) => (tab === 'all' ? true : tab === 'purchased' ? c.type === 'purchased' || c.type === 'bonus' || c.type === 'refunded' : c.type === 'deducted')), [credits, tab]);
  const waiting = (payments || []).filter((p) => p.payUrl || p.paidNotBooked);
  const card = 'rounded-2xl border border-brand-100 bg-white/90 p-5 shadow-sm';
  const bar = 'animate-pulse rounded-md bg-gray-200/80';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold text-brand-950 sm:text-3xl">Credits &amp; payments</h1>
        <p className="mt-1 text-sm text-gray-600">Credits power your Qwesi AI doctor on the website and WhatsApp. Doctor and herbalist consultations are paid for one at a time.</p>
      </header>

      {/* Balance */}
      <section className={`overflow-hidden rounded-2xl p-5 text-white shadow-lg sm:p-6 ${low ? 'bg-gradient-to-br from-amber-600 via-orange-600 to-red-600' : 'bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600'}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold"><Coins className="h-3.5 w-3.5" /> Qwesi AI credits</p>
            {loadingBalance ? (
              <div className="mt-4 h-12 w-40 animate-pulse rounded-lg bg-white/20" />
            ) : balance !== null ? (
              <>
                <p className="mt-3 text-5xl font-bold tracking-tight">{balance.toLocaleString()}</p>
                <p className="mt-1 text-sm text-white/80">≈ {Math.floor(balance / 10)} health questions or {Math.floor(balance / 5)} simple ones</p>
              </>
            ) : (
              <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">{balanceError} <Link href="/patient-portal/profile" className="font-semibold underline">Open my profile</Link></div>
            )}
          </div>
          {low && balance !== null && (
            <div className="flex max-w-xs items-start gap-2 rounded-xl bg-white/15 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{balance === 0 ? 'You are out of credits.' : 'Your credits are running low.'} Top up below to keep chatting with Qwesi.</span>
            </div>
          )}
        </div>
      </section>

      {/* Top up */}
      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-950">Top up credits</h2>
        <p className="mt-1 text-sm text-gray-600">{sym}10 gives you 100 credits. The minimum top-up is {sym}{MIN_TOPUP}.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRESETS.map((a) => (
            <button key={a} type="button" disabled={busy || balance === null} onClick={() => topUp(a)}
              className={`relative rounded-xl border px-3 py-3 text-center transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50 ${a === 20 ? 'border-brand-500 bg-brand-50/60' : 'border-brand-200 bg-white'}`}>
              {a === 20 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent-400 px-2 py-0.5 text-[10px] font-bold text-brand-950">Most popular</span>}
              <span className="block text-lg font-bold text-brand-800">{sym}{a}</span>
              <span className="block text-xs text-gray-500">{(a * CREDITS_PER_UNIT).toLocaleString()} credits</span>
              <span className="mt-0.5 block text-[11px] text-gray-400">≈ {a} health questions</span>
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); topUp(customAmount); }} className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white px-3 focus-within:border-brand-500">
            <span className="text-gray-500">{sym}</span>
            <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="Other amount" className="w-32 bg-transparent px-2 text-base outline-none" />
          </div>
          <button type="submit" disabled={busy || balance === null || !custom}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            <CreditCard className="h-4 w-4" /> {busy ? 'Opening checkout…' : 'Pay securely'}
          </button>
          {customAmount >= MIN_TOPUP && <span className="text-sm text-gray-600">= {(customAmount * CREDITS_PER_UNIT).toLocaleString()} credits</span>}
        </form>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Mobile money or card</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout by Paystack</span>
          {currency === 'USD' && <span>Shown in US dollars; charged in Ghana cedis at the current rate.</span>}
        </p>
      </section>

      {/* Consultations */}
      <section className={card}>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700"><Stethoscope className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-950">Doctor &amp; herbalist consultations</h2>
            <p className="mt-1 text-sm text-gray-600">No monthly plans. Each doctor or herbalist sets their own fee, shown before you book, and you pay only for the consultation you book.</p>
          </div>
        </div>

        {waiting.length > 0 && (
          <div className="mt-4 space-y-2">
            {waiting.map((p) => (
              <div key={p._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-amber-800">{p.payUrl ? `Payment not finished · ${p.currency} ${p.amount}` : `Paid · pick a time to book your slot`}</p>
                </div>
                {p.payUrl ? (
                  <a href={p.payUrl} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">Pay now <ArrowRight className="h-4 w-4" /></a>
                ) : (
                  <Link href="/patient-portal/appointments/new" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">Book now <ArrowRight className="h-4 w-4" /></Link>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/patient-portal/doctors" className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Find a doctor <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/patient-portal/appointments" className="inline-flex h-10 items-center gap-2 rounded-full border border-brand-200 px-5 text-sm font-semibold text-brand-800 hover:bg-brand-50"><CalendarCheck className="h-4 w-4" /> My appointments</Link>
          <Link href="/patient-portal/refunds" className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Refunds &amp; problems</Link>
        </div>
      </section>

      {/* Consultation payments with receipts and refund status */}
      <section className={card}>
        <h2 className="text-base font-semibold text-gray-900">Consultation payments</h2>
        <div className="mt-3 divide-y divide-gray-100">
          {payments === null ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex items-center gap-3 py-3"><div className={`${bar} h-9 w-9 rounded-full`} /><div className="flex-1 space-y-2"><div className={`${bar} h-3 w-1/2`} /><div className={`${bar} h-2.5 w-1/3`} /></div></div>)
          ) : payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No consultation payments yet. When you book a doctor or herbalist, your receipts will appear here.</p>
          ) : payments.map((p) => (
            <div key={p._id} className="flex flex-wrap items-center gap-3 py-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${p.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}><CheckCircle2 className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {fmtDate(p.createdAt)}
                  {p.appointment ? ` · session ${fmtDate(p.appointment.date)} ${p.appointment.time || ''}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${p.status === 'success' ? 'bg-green-100 text-green-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{p.status === 'success' ? 'Paid' : p.status}</span>
                  {p.refund && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.refund.status === 'processed' ? 'bg-blue-100 text-blue-700' : p.refund.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>{REFUND_LABEL[p.refund.status] || p.refund.status}{p.refund.status === 'processed' && p.refund.amount ? ` · ${p.currency} ${p.refund.amount}` : ''}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{p.currency} {Number(p.amount).toLocaleString()}</p>
                {p.status === 'success' && <Link href={`/patient-portal/receipts/${encodeURIComponent(p.reference)}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><FileText className="h-3.5 w-3.5" /> Receipt</Link>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Credit history */}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Credit history</h2>
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 text-xs font-semibold">
            {([['all', 'All'], ['purchased', 'Top-ups'], ['deducted', 'Usage']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full px-3 py-1.5 ${tab === k ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="mt-3 divide-y divide-gray-100">
          {credits === null ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-3 py-3"><div className={`${bar} h-8 w-8 rounded-full`} /><div className="flex-1 space-y-2"><div className={`${bar} h-3 w-1/3`} /><div className={`${bar} h-2.5 w-1/4`} /></div></div>)
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nothing here yet.</p>
          ) : rows.map((c, i) => {
            const plus = c.type !== 'deducted';
            return (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${plus ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{plus ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{c.label}{c.paid ? ` · ${c.paid.currency === 'USD' ? '$' : 'GH₵'}${c.paid.amount}` : ''}</p>
                  <p className="text-xs text-gray-500">{new Date(c.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <p className={`text-sm font-semibold ${plus ? 'text-green-700' : 'text-gray-700'}`}>{plus ? '+' : '−'}{c.credits.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
