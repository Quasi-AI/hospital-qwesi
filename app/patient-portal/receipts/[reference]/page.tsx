'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { ContentSkeleton } from '@/app/components/Skeletons';

export default function ReceiptPage() {
  const { reference } = useParams<{ reference: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/patient-portal/payments?reference=${encodeURIComponent(reference)}`)
      .then(async (r) => (r.ok ? setData(await r.json()) : setError((await r.json().catch(() => ({}))).error || 'Receipt not found')))
      .catch(() => setError('Could not load the receipt'));
  }, [reference]);

  if (error) return <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-600">{error}</div>;
  if (!data) return <ContentSkeleton variant="form" rows={4} />;
  const { payment: p, patient } = data;
  const paid = p.status === 'success';
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2.5 text-sm"><span className="text-gray-500">{k}</span><span className="text-right font-medium text-gray-900">{v}</span></div>
  );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <style>{`@media print { aside, header, nav, .no-print { display: none !important; } body { background: #fff !important; } }`}</style>
      <div className="no-print flex items-center justify-between">
        <Link href="/patient-portal/subscriptions" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to payments</Link>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"><Printer className="h-4 w-4" /> Print / save as PDF</button>
      </div>
      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-2xl font-semibold text-brand-900">Qwesi AI</p>
            <p className="text-xs text-gray-500">Payment receipt</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{paid ? 'Paid' : p.status}</span>
        </div>
        <p className="mt-6 text-4xl font-bold text-gray-950">{p.currency} {Number(p.amount).toLocaleString()}</p>
        <div className="mt-5">
          {row('Receipt no.', <span className="font-mono text-xs">{p.reference}</span>)}
          {row('Date', new Date(p.verifiedAt || p.createdAt).toLocaleString())}
          {row('For', p.name)}
          {p.appointment && row('Appointment', `${new Date(p.appointment.date).toLocaleDateString()} ${p.appointment.time || ''}`)}
          {row('Paid by', `${patient.name}${patient.patientId ? ` (${patient.patientId})` : ''}`)}
          {row('Email', patient.email)}
          {p.refund && row('Refund', <span className="capitalize">{p.refund.status.replace(/_/g, ' ')}{p.refund.amount ? ` · ${p.currency} ${p.refund.amount}` : ''}</span>)}
        </div>
        <p className="mt-6 text-xs text-gray-400">Processed securely by Paystack. Keep this receipt for your records.</p>
      </article>
    </div>
  );
}
