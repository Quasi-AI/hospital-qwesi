'use client';


import { ContentSkeleton } from '@/app/components/Skeletons';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const REASONS: [string, string][] = [
  ['practitioner_no_show', 'The practitioner did not show up'],
  ['technical_failure', 'The call failed / could not connect'],
  ['poor_service', 'Service was not as described'],
  ['other', 'Something else'],
];

export default function RefundsPage() {
  const [data, setData] = useState<any>({ refunds: [], eligible: [] });
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState('');
  const [reason, setReason] = useState('practitioner_no_show');
  const [details, setDetails] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetch('/api/patient-portal/refunds');
    if (r.ok) setData(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    const r = await fetch('/api/patient-portal/refunds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: sel, reason, details }) });
    const d = await r.json();
    if (r.ok) { setMsg(d.autoApproved ? 'Approved. Your refund is on its way to your original payment method.' : 'Request received. Our team will review it and reply within 2 working days.'); setSel(''); setDetails(''); await load(); }
    else setMsg(d.error || 'Could not submit');
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-gray-900">Report a problem / request a refund</h1>
      <p className="text-sm text-gray-600">Refunds go back to the card or account you paid with. If the practitioner never joined while you waited, it is approved automatically. If you only need a different time, reschedule instead of requesting a refund.</p>
      {loading ? <ContentSkeleton /> : (
        <>
          <form onSubmit={submit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <select required value={sel} onChange={(e) => setSel(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="">Choose a paid consultation…</option>
              {data.eligible.map((x: any) => (
                <option key={x.appointmentId} value={x.appointmentId}>{x.appointment.doctorName} · {new Date(x.appointment.appointmentDate).toLocaleDateString()} · {x.currency} {x.amount}</option>
              ))}
            </select>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
              {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Tell us what happened" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <button disabled={busy || !sel} className="rounded-lg bg-[#6949ED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Submit request'}</button>
            {msg && <p className="text-sm text-gray-800">{msg}</p>}
          </form>
          <div className="space-y-2">
            {data.refunds.map((r: any) => (
              <div key={r._id} className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
                <div className="flex justify-between gap-2"><span className="font-medium text-gray-900">{r.doctorName} · {r.currency} {r.amountPaid}</span><span className="capitalize text-[#6949ED]">{String(r.status).replace(/_/g, ' ')}</span></div>
                {r.adminNote && <p className="mt-1 text-xs text-gray-600">{r.adminNote}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
