import Link from 'next/link';
import { CheckCircle2, Stethoscope } from 'lucide-react';
import { qwesiPaygItems, qwesiSubscriptionPlans } from '@/lib/qwesi-pricing';

export const metadata = {
  title: 'Qwesi Care Pricing',
  description: 'Qwesi PAYG and patient subscription pricing.',
};

export default function PublicSubscriptionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <Stethoscope className="h-4 w-4" />
            Qwesi Care
          </Link>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Qwesi patient pricing</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Flexible pay-as-you-go services and monthly care subscriptions for patients and families.
            </p>
          </div>
          <div>
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-[#1447e6] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              Sign in to subscribe
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-slate-950">PAYG services</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {qwesiPaygItems.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-950">{item.name}</h3>
                <p className="shrink-0 text-sm font-bold text-blue-700">{item.priceLabel}</p>
              </div>
              {item.description && <p className="mt-2 text-sm text-slate-500">{item.description}</p>}
              <ul className="mt-3 space-y-2">
                {item.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-slate-950">Monthly patient subscriptions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {qwesiSubscriptionPlans.map((plan) => (
            <article key={plan.id} className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{plan.name}</h3>
              <p className="mt-1 text-2xl font-bold text-blue-700">{plan.priceLabel}</p>
              <p className="mt-2 text-sm text-slate-500">{plan.audience}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
