'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, CreditCard, Loader2, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react';
import { qwesiPaygItems, qwesiSubscriptionPlans } from '@/lib/qwesi-pricing';

type PaymentState = {
  loading: boolean;
  message: string;
  type: 'info' | 'success' | 'error';
};

export default function PatientSubscriptionsPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const [paymentState, setPaymentState] = useState<PaymentState>({
    loading: false,
    message: '',
    type: 'info',
  });
  const [history, setHistory] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const activePlanIds = useMemo(
    () => new Set(subscriptions.filter((sub) => sub.status === 'active').map((sub) => sub.planId)),
    [subscriptions]
  );

  const refreshHistory = async () => {
    const response = await fetch('/api/patient-portal/subscriptions');
    if (response.ok) {
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
      setHistory(data.transactions || []);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;

    const verify = async () => {
      setPaymentState({ loading: true, message: 'Verifying Paystack payment...', type: 'info' });
      const response = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`);
      const data = await response.json();
      if (cancelled) return;
      if (response.ok) {
        setPaymentState({ loading: false, message: 'Payment verified successfully.', type: 'success' });
        refreshHistory();
      } else {
        setPaymentState({ loading: false, message: data.error || 'Payment verification failed.', type: 'error' });
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const startPayment = async (itemType: 'subscription' | 'payg', itemId: string, amount?: number) => {
    setPaymentState({ loading: true, message: 'Opening Paystack checkout...', type: 'info' });
    const response = await fetch('/api/payments/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemId, amount }),
    });
    const data = await response.json();
    if (!response.ok) {
      setPaymentState({ loading: false, message: data.error || 'Could not start payment.', type: 'error' });
      return;
    }
    window.location.href = data.authorizationUrl;
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
        <div className="grid gap-4 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-700 p-5 text-white lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Paystack checkout
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Subscriptions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-50 sm:text-base">
              Choose a monthly care plan or pay for a one-time service. Your payment history stays here for quick review.
            </p>
          </div>
          <div className="rounded-lg border border-white/20 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Active plans</p>
            <p className="mt-2 text-3xl font-bold">{activePlanIds.size}</p>
            <p className="mt-1 text-sm text-blue-50">
              {activePlanIds.size ? 'Your care plan is active.' : 'Select a plan below to get started.'}
            </p>
          </div>
        </div>
      </section>

      {paymentState.message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            paymentState.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : paymentState.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}
        >
          {paymentState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          <span>{paymentState.message}</span>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Monthly care</p>
            <h2 className="text-lg font-semibold text-gray-950">Patient plans</h2>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {qwesiSubscriptionPlans.map((plan, index) => (
            <article key={plan.id} className="flex min-h-[18rem] flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{plan.audience}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {index === 1 ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Popular</span>
                  ) : null}
                  {activePlanIds.has(plan.id) && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Active</span>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xl font-bold text-blue-700">{plan.priceLabel}</p>
              <ul className="mt-3 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={paymentState.loading}
                onClick={() => startPayment('subscription', plan.id, plan.amount)}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1447e6] px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                Pay with Paystack
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">One-time services</p>
            <h2 className="text-base font-semibold text-gray-950">PAYG services</h2>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {qwesiPaygItems.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm font-bold text-blue-700">{item.priceLabel}</p>
              </div>
              {item.description && <p className="mt-2 text-xs text-gray-500">{item.description}</p>}
              <ul className="mt-3 space-y-2">
                {item.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {item.maxAmount > 0 && (
                <button
                  type="button"
                  disabled={paymentState.loading}
                  onClick={() => startPayment('payg', item.id, item.minAmount)}
                  className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay from {item.currency} {item.minAmount}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Recent payments</h2>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">No payments yet.</td>
                </tr>
              ) : (
                history.map((tx) => (
                  <tr key={tx._id}>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-600">{tx.reference}</td>
                    <td className="py-2 pr-4 text-gray-900">{tx.itemName}</td>
                    <td className="py-2 pr-4 text-gray-700">{tx.currency} {tx.amount}</td>
                    <td className="py-2 pr-4 capitalize text-gray-700">{tx.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
