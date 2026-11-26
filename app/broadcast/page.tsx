'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail, Search, Send, Users, X } from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';

type Group = { id: string; label: string };
type Person = { kind: string; id: string; name: string; email: string };
type Hist = { _id: string; subject: string; total: number; sent: number; failed: number; status: 'sending' | 'done'; groups: string[]; createdAt: string; createdByName?: string };

const KIND_LABEL: Record<string, string> = { patients: 'Patient', doctors: 'Doctor', herbalists: 'Herbalist', pharmacists: 'Pharmacist', staff: 'Staff' };
const card = 'rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm';
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30';

function BroadcastInner() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Hist[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState<'' | 'send' | 'test'>('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/broadcast', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    setGroups(j.groups); setCounts(j.counts); setHistory(j.history);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!history.some((h) => h.status === 'sending')) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [history, load]);

  // live recipient count
  useEffect(() => {
    if (!picked.length && !people.length) { setTotal(0); return; }
    const t = setTimeout(async () => {
      const r = await fetch('/api/admin/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun: true, groups: picked, specific: people }) });
      if (r.ok) setTotal((await r.json()).total);
    }, 300);
    return () => clearTimeout(t);
  }, [picked, people]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/admin/broadcast?q=${encodeURIComponent(q.trim())}`);
      setResults(r.ok ? (await r.json()).people : []);
      setSearching(false);
    }, 300);
  }, [q]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const addPerson = (p: Person) => { setPeople((l) => (l.some((x) => x.id === p.id) ? l : [...l, p])); setQ(''); setResults([]); };

  const send = async (test: boolean) => {
    setNote(null);
    if (!test && !confirm(`Send this email to ${total} ${total === 1 ? 'person' : 'people'}? This cannot be undone.`)) return;
    setBusy(test ? 'test' : 'send');
    try {
      const r = await fetch('/api/admin/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, message, groups: picked, specific: people, test }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
      if (test) setNote({ ok: true, text: `Test sent to ${j.sentTo}. Check your inbox.` });
      else { setNote({ ok: true, text: `Sending to ${j.total} people. You can leave this page; progress shows below.` }); setSubject(''); setMessage(''); setPicked([]); setPeople([]); load(); }
    } catch (e: any) { setNote({ ok: false, text: e.message }); }
    finally { setBusy(''); }
  };

  const ready = subject.trim() && message.trim() && (total ?? 0) > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 pb-12">
      <div>
        <p className="text-sm text-slate-600">Send an email to everyone in a group or to specific people. Use <code className="rounded bg-slate-100 px-1">{'{{name}}'}</code> to greet each person by first name.</p>
      </div>

      <section className={card}>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><Users className="h-5 w-5 text-teal-600" />1. Who should receive it?</h2>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button key={g.id} onClick={() => toggle(g.id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${picked.includes(g.id) ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-slate-700 hover:border-teal-500'}`}>
              {picked.includes(g.id) && <CheckCircle2 className="mr-1 inline h-4 w-4" />}{g.label} <span className="opacity-70">({counts[g.id] ?? '…'})</span>
            </button>
          ))}
          <button onClick={() => setPicked(picked.length === groups.length ? [] : groups.map((g) => g.id))} className="rounded-full border border-dashed border-slate-300 px-3.5 py-1.5 text-sm text-slate-500 hover:border-teal-500">{picked.length === groups.length && groups.length ? 'Clear all' : 'Everyone'}</button>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or find specific people by name or email…" className={`${field} pl-9`} />
          {(results.length > 0 || searching) && (
            <ul style={{ backgroundColor: '#ffffff', opacity: 1 }} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {searching && <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>}
              {results.map((p) => (
                <li key={p.id}><button onClick={() => addPerson(p)} style={{ backgroundColor: '#ffffff' }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-teal-50">
                  <span className="min-w-0 flex-1 truncate"><span className="font-medium text-slate-900">{p.name}</span><span className="ml-2 text-slate-500">{p.email}</span></span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{KIND_LABEL[p.kind] || p.kind}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
        {people.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {people.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800">
                {p.name} <span className="text-xs opacity-70">· {KIND_LABEL[p.kind]}</span>
                <button aria-label={`Remove ${p.name}`} onClick={() => setPeople((l) => l.filter((x) => x.id !== p.id))}><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-sm font-medium text-slate-700">{total === null ? '' : total === 0 ? 'No one selected yet.' : `${total} ${total === 1 ? 'person' : 'people'} will receive this (duplicates and people without an email are skipped).`}</p>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold text-slate-900">2. Write your message</h2>
        <div className="space-y-3">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" maxLength={200} className={field} />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={9} placeholder={'Hello {{name}},\n\nWrite your message here. Leave a blank line to start a new paragraph.'} className={field} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={!ready || !!busy} onClick={() => send(false)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-700 disabled:opacity-50">{busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send to {total || 0}</button>
          <button disabled={!subject.trim() || !message.trim() || !!busy} onClick={() => send(true)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busy === 'test' ? 'Sending…' : 'Send me a test'}</button>
          {note && <span className={`text-sm ${note.ok ? 'text-emerald-600' : 'text-red-600'}`}>{note.text}</span>}
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold text-slate-900">Recent broadcasts</h2>
        {!history.length && <p className="text-sm text-slate-500">Nothing sent yet.</p>}
        <ul className="divide-y divide-slate-100">
          {history.map((h) => (
            <li key={h._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{h.subject}</p>
                <p className="text-xs text-slate-500">{new Date(h.createdAt).toLocaleString()}{h.createdByName ? ` · ${h.createdByName}` : ''}</p>
              </div>
              <div className="text-right text-sm">
                {h.status === 'sending'
                  ? <span className="inline-flex items-center gap-1 text-amber-600"><Loader2 className="h-4 w-4 animate-spin" />{h.sent + h.failed}/{h.total}</span>
                  : <span className="text-slate-700"><span className="text-emerald-600">{h.sent} sent</span>{h.failed > 0 && <span className="text-red-600"> · {h.failed} failed</span>}</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function BroadcastPage() {
  return (
    <ProtectedRoute>
      <SidebarLayout title="Email broadcast">
        <BroadcastInner />
      </SidebarLayout>
    </ProtectedRoute>
  );
}
