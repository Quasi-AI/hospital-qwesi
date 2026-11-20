'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, HeartPulse, Leaf, Search, ShieldCheck, Stethoscope, Video, Wallet } from 'lucide-react';
import type { WebsiteContentData } from '@/lib/defaultWebsiteContent';
import type { LandingSettingsSnapshot } from '@/lib/getLandingSettings';

type Provider = {
  id: string; name: string; specialization?: string; department?: string;
  providerType?: 'doctor' | 'herbalist'; consultationFee?: number; currency?: string;
  rating?: number; yearsOfExperience?: number;
};

export type { LandingSettingsSnapshot };

export function HospitalLanding({ content, settings }: { content: WebsiteContentData; settings: LandingSettingsSnapshot }) {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'doctor' | 'herbalist'>('all');
  const [loading, setLoading] = useState(true);
  const brand = (settings?.systemTitle?.trim() || 'Qwesi Care').replace(/hospital/ig, 'care').trim() || 'Qwesi Care';

  useEffect(() => {
    let active = true;
    fetch('/api/public/booking/doctors')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (active) setProviders(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setProviders([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => providers.filter(p => {
    const text = `${p.name} ${p.specialization || ''} ${p.department || ''}`.toLowerCase();
    return (kind === 'all' || p.providerType === kind) && text.includes(query.toLowerCase());
  }), [providers, kind, query]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf9] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white"><HeartPulse className="h-5 w-5" /></span>
            <span className="text-xl">{brand}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#find-care" className="hover:text-emerald-700">Find care</a>
            <a href="#how-it-works" className="hover:text-emerald-700">How it works</a>
            <a href="#providers" className="hover:text-emerald-700">For providers</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href={session ? '/dashboard' : '/login'} className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">{session ? 'Dashboard' : 'Log in'}</Link>
            <Link href="/signup" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">Get started</Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_75%_15%,rgba(16,185,129,.16),transparent_42%),radial-gradient(ellipse_at_10%_90%,rgba(14,165,233,.10),transparent_38%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Healthcare that meets you where you are</div>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">The right care, <span className="text-emerald-600">without the waiting room.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">Discover trusted doctors and herbalists, compare consultation fees, book a time that works, and meet securely online.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#find-care" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-semibold text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700">Find a provider <ArrowRight className="h-4 w-4" /></a>
              <Link href="/signup?role=doctor" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:border-emerald-300">Join as a provider</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Verified provider profiles</span>
              <span className="flex items-center gap-2"><Video className="h-4 w-4 text-emerald-600" /> Online consultations</span>
              <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600" /> Clear consultation fees</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/60 to-sky-200/60 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
              <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-500">Your care, simplified</p><p className="mt-1 text-2xl font-bold">One simple journey</p></div><span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><HeartPulse className="h-6 w-6" /></span></div>
              <div className="mt-7 space-y-4">
                {[['01','Find your provider','Browse doctors and herbalists'],['02','Choose your time','See availability and consultation fees'],['03','Book securely','Confirm your appointment online'],['04','Meet virtually','Connect by secure video consultation']].map(([n,t,d]) => <div key={n} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800">{n}</span><div><p className="font-semibold">{t}</p><p className="mt-0.5 text-sm text-slate-500">{d}</p></div><CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-500" /></div>)}
              </div>
              <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white"><p className="text-sm font-semibold">Care from wherever you are</p><p className="mt-1 text-xs leading-5 text-slate-300">No physical hospital visit required for your online consultation.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="find-care" className="scroll-mt-24 border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Explore care</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Find the right provider</h2><p className="mt-3 max-w-xl text-slate-600">Search by name or speciality and choose the kind of care you prefer.</p></div>
            <Link href="/request-appointment" className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:text-emerald-800">Book an appointment <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search provider or speciality..." className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></div>
            <div className="flex gap-2">
              {[['all','All providers'],['doctor','Doctors'],['herbalist','Herbalists']].map(([v,l])=><button key={v} onClick={()=>setKind(v as any)} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition sm:flex-none ${kind===v?'bg-emerald-600 text-white':'bg-white text-slate-600 hover:bg-emerald-50'}`}>{l}</button>)}
            </div>
          </div>
          {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading available providers…</p> : filtered.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice(0,6).map(p=><article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5"><div className="flex items-start justify-between"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.providerType==='herbalist'?'bg-lime-50 text-lime-800':'bg-emerald-50 text-emerald-800'}`}>{p.providerType==='herbalist'?'Herbalist':'Doctor'}</span><span className="text-xs text-slate-400">Online care</span></div><div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">{p.providerType==='herbalist'?<Leaf/>:<Stethoscope/>}</div><h3 className="mt-4 text-lg font-bold">{p.name}</h3><p className="mt-1 text-sm text-slate-500">{p.specialization||p.department||'Healthcare provider'}</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-400">Consultation fee</p><p className="font-bold text-slate-900">{typeof p.consultationFee==='number' ? `${p.currency||'GHS'} ${p.consultationFee.toFixed(2)}` : 'Fee on profile'}</p></div><Link href={`/request-appointment?provider=${p.id}`} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">View & book</Link></div></article>)}</div> : <div className="mt-7 rounded-2xl border border-dashed border-slate-300 py-12 text-center"><Stethoscope className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 font-semibold">No providers to show yet</p><p className="mt-1 text-sm text-slate-500">Try another search or check back soon as providers join.</p></div>}
        </div>
      </section>

      <section id="how-it-works" className="py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Simple by design</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">From discovery to video visit</h2><p className="mt-3 text-slate-600">Everything you need to arrange a virtual consultation in one place.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[Search,'Discover','Explore provider profiles, specialities and fees.'],[CalendarDays,'Choose a time','Pick an available appointment slot.'],[Wallet,'Confirm booking','Review the total and complete payment.'],[Video,'Connect online','Join your scheduled video consultation.']].map(([Icon,title,desc],i)=>{const I=Icon as any;return <div key={String(title)} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><I className="h-6 w-6"/></span><p className="mt-5 text-xs font-bold text-emerald-700">STEP 0{i+1}</p><h3 className="mt-2 text-lg font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{String(desc)}</p></div>})}</div></div></section>

      <section id="providers" className="bg-slate-900 py-16 text-white sm:py-20"><div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">For care providers</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Grow your practice online.</h2><p className="mt-4 leading-7 text-slate-300">Create your professional profile, set your own consultation fee, manage your availability and meet patients remotely. Doctors and herbalists are welcome.</p></div><Link href="/signup?role=doctor" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-white hover:bg-emerald-400">Become a provider <ArrowRight className="h-4 w-4"/></Link></div></section>
      <footer className="border-t border-slate-200 bg-white py-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>© {new Date().getFullYear()} {brand}. Virtual care, made simpler.</span><div className="flex gap-5"><Link href="/login" className="hover:text-emerald-700">Log in</Link><Link href="/signup" className="hover:text-emerald-700">Create account</Link></div></div></footer>
    </main>
  );
}
