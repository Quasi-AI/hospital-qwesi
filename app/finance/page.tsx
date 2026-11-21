'use client';

import { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { Loader2 } from 'lucide-react';

type Tab = 'withdrawals' | 'refunds' | 'summary';
const btn = 'rounded-lg px-3 py-1.5 text-xs font-semibold';

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('withdrawals');
  const [wd, setWd] = useState<any[]>([]);
  const [rf, setRf] = useState<any[]>([]);
  const [sum, setSum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [settings, setSettings] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b, c] = await Promise.all([
      fetch('/api/admin/finance/withdrawals').then((r) => r.json()),
      fetch('/api/admin/finance/refunds').then((r) => r.json()),
      fetch('/api/admin/finance/summary').then((r) => r.json()),
    ]);
    setWd(a.withdrawals || []); setRf(b.refunds || []); setSum(c); setSettings(c.settings || {});
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (url: string, body: any) => {
    setMsg('');
    const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    setMsg(r.ok ? 'Done.' : d.error || 'Failed');
    await load();
  };

  const payOut = (w: any) => {
    const reference = prompt(`Send ${w.currency} ${w.amount} to ${w.accountName} (${w.accountNumber}) from Paystack/MoMo, then enter the transfer reference:`);
    if (reference) act('/api/admin/finance/withdrawals', { id: w._id, action: 'mark_paid', reference });
  };
  const rejectW = (w: any) => {
    const note = prompt('Reason for rejecting (the money returns to their wallet):');
    if (note) act('/api/admin/finance/withdrawals', { id: w._id, action: 'reject', note });
  };
  const refund = (r: any) => {
    const amt = prompt(`Refund amount (full is ${r.currency} ${r.amountPaid}). Leave as is for a full refund:`, String(r.amountPaid));
    if (amt) act('/api/admin/finance/refunds', { id: r._id, action: 'refund', amount: Number(amt) });
  };
  const deny = (r: any) => {
    const note = prompt('Reason shown to the patient:');
    if (note) act('/api/admin/finance/refunds', { id: r._id, action: 'deny', note });
  };
  const done = (r: any) => {
    const note = prompt('Paystack refund reference / note:');
    if (note) act('/api/admin/finance/refunds', { id: r._id, action: 'mark_done', note });
  };

  const fields: [string, string][] = [['commissionPercent', 'Commission %'], ['holdHours', 'Safety hold (hours)'], ['minWithdrawal', 'Minimum withdrawal'], ['payoutMethodCooldownHours', 'New payout account wait (hours)'], ['refundWindowDays', 'Refund window (days)'], ['noShowGraceMinutes', 'No-show grace (minutes)']];

  return (
    <ProtectedRoute>
      <SidebarLayout title="Payouts & refunds" description="Withdrawals, refunds and commission" dense>
        <div className="mb-4 flex flex-wrap gap-2">
          {(['withdrawals', 'refunds', 'summary'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`${btn} capitalize ${tab === t ? 'bg-[#6949ED] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>{t === 'summary' ? 'Summary & settings' : t}</button>
          ))}
        </div>
        {msg && <p className="mb-3 rounded-lg bg-purple-50 p-2 text-sm text-gray-800">{msg}</p>}
        {loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#6949ED]" /></div> : (
          <>
            {tab === 'withdrawals' && (
              <div className="space-y-3">
                {wd.length === 0 && <p className="text-sm text-gray-500">No withdrawal requests.</p>}
                {wd.map((w) => (
                  <div key={w._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{w.ownerName} · {w.currency} {Number(w.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-600">{w.payoutMethod === 'bank' ? `${w.bankName || 'Bank'}` : w.mobileMoneyProvider || 'Mobile money'} · {w.accountName} · {w.accountNumber}</p>
                        <p className="text-xs text-gray-500">{new Date(w.createdAt).toLocaleString()} · {w.owner?.email}</p>
                        {!w.nameMatchesProfile && <p className="mt-1 text-xs font-semibold text-red-600">Account name does not match the practitioner&apos;s name. Verify before paying.</p>}
                        {w.owner?.approvalStatus !== 'approved' && <p className="text-xs font-semibold text-red-600">Practitioner is not verified.</p>}
                        {w.payoutReference && <p className="text-xs text-gray-500">Ref: {w.payoutReference}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold capitalize text-[#6949ED]">{w.status}</span>
                        {['pending', 'approved'].includes(w.status) && (<>
                          <button onClick={() => payOut(w)} className={`${btn} bg-[#6949ED] text-white`}>Mark paid</button>
                          <button onClick={() => rejectW(w)} className={`${btn} border border-gray-300 text-gray-800`}>Reject</button>
                        </>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'refunds' && (
              <div className="space-y-3">
                {rf.length === 0 && <p className="text-sm text-gray-500">No refund requests.</p>}
                {rf.map((r) => (
                  <div key={r._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{r.patientName} → {r.doctorName} · {r.currency} {Number(r.amountPaid).toFixed(2)}</p>
                        <p className="text-xs capitalize text-gray-600">{String(r.reason).replace(/_/g, ' ')}</p>
                        {r.details && <p className="mt-1 text-sm text-gray-800">{r.details}</p>}
                        <div className="mt-2 grid grid-cols-1 gap-x-4 text-xs text-gray-500 sm:grid-cols-2">
                          <span>Scheduled: {r.evidence?.scheduledStart ? new Date(r.evidence.scheduledStart).toLocaleString() : '-'}</span>
                          <span>Patient joined: {r.evidence?.patientJoinedAt ? new Date(r.evidence.patientJoinedAt).toLocaleTimeString() : 'never'}</span>
                          <span>Practitioner joined: {r.evidence?.practitionerJoinedAt ? new Date(r.evidence.practitionerJoinedAt).toLocaleTimeString() : 'never'}</span>
                          <span>Call length: {r.evidence?.durationMinutes ?? 0} min · chat msgs: {r.evidence?.chatMessages ?? 0}</span>
                          <span>Refunds against this practitioner: {r.practitionerRefundCount}</span>
                        </div>
                        {r.flagged && <p className="mt-1 text-xs font-semibold text-red-600">Flagged: this patient has requested several refunds recently.</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold capitalize text-[#6949ED]">{String(r.status).replace(/_/g, ' ')}</span>
                        {r.status === 'pending_review' && (<>
                          <button onClick={() => refund(r)} className={`${btn} bg-[#6949ED] text-white`}>Refund</button>
                          <button onClick={() => deny(r)} className={`${btn} border border-gray-300 text-gray-800`}>Deny</button>
                        </>)}
                        {r.status === 'manual_required' && <button onClick={() => done(r)} className={`${btn} bg-[#6949ED] text-white`}>I refunded it in Paystack</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Box title="Earnings & commission (by currency)" rows={(sum?.earnings || []).map((e: any) => `${e._id}: collected ${e.gross?.toFixed?.(2)}, commission ${e.commission?.toFixed?.(2)}, practitioners ${e.net?.toFixed?.(2)}`)} />
                  <Box title="Owed to practitioners" rows={(sum?.wallets || []).map((w: any) => `${w._id}: on hold ${w.held?.toFixed?.(2)}, available ${w.available?.toFixed?.(2)}, in payout ${w.inPayout?.toFixed?.(2)}`)} />
                  <Box title="Withdrawals" rows={(sum?.withdrawals || []).map((w: any) => `${w._id.currency} ${w._id.status}: ${w.total?.toFixed?.(2)} (${w.count})`)} />
                  <Box title="Refunds" rows={(sum?.refunds || []).map((w: any) => `${w._id.currency} ${w._id.status}: ${w.total?.toFixed?.(2) || 0} (${w.count})`)} />
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">Rules</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map(([k, label]) => (
                      <label key={k} className="text-xs font-medium text-gray-600">{label}
                        <input type="number" value={settings[k] ?? ''} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                      </label>
                    ))}
                  </div>
                  <button onClick={() => act('/api/admin/finance/summary', settings)} className={`${btn} mt-3 bg-[#6949ED] text-white`}>Save rules</button>
                </div>
              </div>
            )}
          </>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}

function Box({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 ? <p className="text-xs text-gray-500">Nothing yet.</p> : rows.map((r, i) => <p key={i} className="text-xs text-gray-700">{r}</p>)}
    </div>
  );
}
