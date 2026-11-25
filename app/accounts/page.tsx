'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Archive, RotateCcw, Search, Trash2 } from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { ContentSkeleton } from '@/app/components/Skeletons';
import { DeleteAccountModal, type DeleteTarget } from '@/app/components/DeleteAccountModal';
import { notify } from '@/lib/notify';

type Tab = 'doctor' | 'herbalist' | 'pharmacy' | 'patient';
const TABS: { id: Tab; label: string; singular: string }[] = [
  { id: 'doctor', label: 'Doctors', singular: 'doctor' },
  { id: 'herbalist', label: 'Herbalists', singular: 'herbalist' },
  { id: 'pharmacy', label: 'Pharmacists', singular: 'pharmacist' },
  { id: 'patient', label: 'Patients', singular: 'patient' },
];

export default function AccountsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [tab, setTab] = useState<Tab>('doctor');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => { if (session && !isAdmin) router.push('/dashboard'); }, [session, isAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      if (view === 'archived') {
        const res = await fetch(`/api/admin/accounts?type=${tab === 'patient' ? 'patient' : 'user'}${tab === 'patient' ? '' : `&role=${tab === 'herbalist' ? 'herbalist' : tab}`}`, { cache: 'no-store' });
        data = res.ok ? await res.json() : [];
      } else if (tab === 'patient') {
        const res = await fetch('/api/patients', { cache: 'no-store' });
        data = res.ok ? await res.json() : [];
      } else if (tab === 'pharmacy') {
        const res = await fetch('/api/pharmacy/providers', { cache: 'no-store' });
        data = res.ok ? await res.json() : [];
      } else {
        const res = await fetch('/api/doctors', { cache: 'no-store' });
        const all = res.ok ? await res.json() : [];
        data = all.filter((d: any) => (tab === 'herbalist') === (d.practitionerType === 'herbalist'));
      }
      setRows(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [tab, view]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.email || r.originalEmail || ''} ${r.phone || r.originalPhone || ''}`.toLowerCase().includes(q));
  }, [rows, search]);

  const singular = TABS.find((t) => t.id === tab)!.singular;
  const type: 'user' | 'patient' = tab === 'patient' ? 'patient' : 'user';

  const act = async (id: string, action: 'restore' | 'permanent', name: string) => {
    if (action === 'permanent' && !confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    const res = await fetch('/api/admin/accounts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, id, action }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { notify(data.error || 'Failed'); return; }
    notify(action === 'restore' ? `${name} was restored.` : `${name} was permanently deleted.`);
    load();
  };

  return (
    <ProtectedRoute>
      <SidebarLayout title="Manage accounts" description="Archive or permanently delete doctors, herbalists, pharmacists and patients so they can register again" dense>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => { setTab(t.id); setSearch(''); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === t.id ? 'bg-violet-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm">
              {(['active', 'archived'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} className={`rounded-md px-3 py-1 font-medium capitalize ${view === v ? 'bg-white shadow-sm text-gray-950' : 'text-gray-600'}`}>{v}</button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-6"><ContentSkeleton /></div>
            ) : shown.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">{view === 'archived' ? `No archived ${singular}s.` : `No ${singular}s found.`}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {shown.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-950">{r.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {r.email || r.originalEmail}{(r.phone || r.originalPhone) ? ` · ${r.phone || r.originalPhone}` : ''}
                        {view === 'archived' && r.deletedAt ? ` · archived ${new Date(r.deletedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {view === 'active' ? (
                        <button type="button" onClick={() => setTarget({ type, id: r._id, name: r.name, label: singular })}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      ) : (
                        <>
                          <button type="button" onClick={() => act(r._id, 'restore', r.name)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                          </button>
                          <button type="button" onClick={() => act(r._id, 'permanent', r.name)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700">
                            <Trash2 className="h-3.5 w-3.5" /> Delete forever
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="flex items-start gap-2 text-xs text-gray-500"><Archive className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Archiving or deleting frees the person's email and phone number, so they can sign up again with a fresh account.</p>
        </div>
      </SidebarLayout>
      <DeleteAccountModal target={target} onClose={() => setTarget(null)} onDone={(m) => { notify(m); load(); }} />
    </ProtectedRoute>
  );
}
