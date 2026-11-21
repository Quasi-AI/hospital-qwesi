'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowRight,
  Baby,
  BadgeCheck,
  Brain,
  CalendarCheck,
  Check,
  ChevronDown,
  CreditCard,
  Heart,
  Mail,
  Phone,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundSearch,
  Video,
  Wallet,
  Wind,
} from 'lucide-react';
import type { WebsiteContentData } from '@/lib/defaultWebsiteContent';
import type { LandingSettingsSnapshot } from '@/lib/getLandingSettings';
import dynamic from 'next/dynamic';
import { PublicHeader, PublicFooter } from './public-shell';

const PublicChat = dynamic(() => import('./public-shell').then((m) => m.PublicChat), { ssr: false });
import { DoctorCard, DoctorCardSkeleton, DoctorAvatar, doctorTitle, formatFee } from './doctor-card';
import { usePublicDoctors } from './doctor-marketplace';

export type { LandingSettingsSnapshot };

const SPECIALTY_ICONS = [Stethoscope, Heart, Sparkles, Baby, Wind, Brain] as const;
const STEP_ICONS = [UserRoundSearch, CalendarCheck, CreditCard, Video] as const;
const TRUST_ICONS = [Wallet, BadgeCheck, ShieldCheck, Heart] as const;

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  if (!children) return null;
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.2em] ${light ? 'text-accent-300' : 'text-brand-700'}`}>{children}</p>
  );
}

export function HospitalLanding({
  content,
  settings,
}: {
  content: WebsiteContentData;
  settings: LandingSettingsSnapshot;
}) {
  const router = useRouter();
  const { doctors, loading } = usePublicDoctors();
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const email = settings?.address?.email?.trim();
  const phone = settings?.address?.phone?.trim();
  const featured = [...doctors]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.ratingCount - a.ratingCount)
    .slice(0, 6);
  const heroPreview = featured.slice(0, 3);
  const lowestFee = doctors.length ? Math.min(...doctors.map((d) => d.consultationFee)) : null;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/find-doctors?specialty=${encodeURIComponent(q)}` : '/find-doctors');
  };

  return (
    <div className="min-h-screen text-gray-900 selection:bg-brand-100 selection:text-brand-950">
      {content.announcementText.trim() && (
        <div className="bg-accent-400 px-4 py-2 text-center text-sm font-medium text-brand-950">{content.announcementText}</div>
      )}

      {/* ───────── Hero ───────── */}
      <section className="qw-hero-bg relative overflow-hidden text-white">
        <PublicHeader settings={settings} tone="dark" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div className="hero-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-brand-100 backdrop-blur sm:text-sm">
              <span className="pulse-ring h-2 w-2 rounded-full bg-accent-300" /> {content.heroBadge}
            </span>
            <h1 className="font-display mt-6 text-balance text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              {content.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/75">{content.heroSubtitle}</p>

            <form
              onSubmit={search}
              className="glass-strong mt-8 flex max-w-xl flex-col gap-2 rounded-3xl p-2 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:rounded-full"
            >
              <label className="relative flex-1">
                <span className="sr-only">Specialty or condition</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Specialty, e.g. Cardiology"
                  className="h-12 w-full rounded-full bg-transparent pl-12 pr-4 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-7 font-semibold text-white transition hover:bg-brand-700"
              >
                {content.heroCtaPrimary || 'Find a doctor'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <ul className="mt-7 grid max-w-xl gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {content.heroBullets.slice(0, 4).map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-white/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Live doctor preview */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-6 -z-0 rounded-[2.5rem] bg-brand-400/20 blur-3xl" aria-hidden />
            <div className="glass-dark float-slow relative space-y-3 rounded-[2rem] p-4 sm:p-5">
              <div className="flex items-center justify-between px-1 text-sm text-white/80">
                <span className="font-semibold">Available now</span>
                {lowestFee != null && <span>from {formatFee(lowestFee)}</span>}
              </div>
              {loading ? (
                [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/10" />)
              ) : heroPreview.length > 0 ? (
                heroPreview.map((d) => (
                  <Link
                    key={d.id}
                    href={`/find-doctors/${d.id}`}
                    className="glass-strong flex items-center gap-4 rounded-2xl p-3.5 text-gray-900 transition hover:-translate-y-0.5"
                  >
                    <DoctorAvatar doctor={d} className="h-16 w-16" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{doctorTitle(d.name, d.practitionerType)}</p>
                      <p className="truncate text-sm text-brand-700">{d.specialization || d.department || 'General Practice'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-semibold text-brand-800">{formatFee(d.consultationFee, d.currency)}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Book →</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="glass-strong rounded-2xl p-6 text-center text-gray-700">
                  <Stethoscope className="mx-auto h-8 w-8 text-brand-500" />
                  <p className="mt-2 font-semibold">Doctors are joining now</p>
                  <p className="text-sm text-gray-500">Check back soon or sign up to be notified.</p>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-2xl bg-brand-900/60 px-4 py-3 text-sm text-white/85">
                <ShieldCheck className="h-5 w-5 shrink-0 text-accent-300" />
                Pay securely by mobile money or card. Slot confirmed instantly.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Trust strip ───────── */}
      <section className="glass-strong border-x-0 border-t-0 !rounded-none" aria-label={content.trustPillarsTitle}>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {content.trustPillars.slice(0, 4).map((p, i) => {
            const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
            return (
              <div key={p.title} className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.title}</p>
                  <p className="text-xs text-gray-600 sm:text-sm">{p.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────── Featured doctors ───────── */}
      <section id="doctors" className="cv-auto scroll-mt-20 bg-white/20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>{content.providersEyebrow}</Eyebrow>
              <h2 className="font-display mt-2 text-3xl font-semibold text-brand-950 sm:text-4xl">{content.providersTitle}</h2>
              <p className="mt-3 text-gray-600">{content.providersSubtitle}</p>
            </div>
            <Link href="/find-doctors" className="inline-flex shrink-0 items-center gap-2 font-semibold text-brand-700 hover:text-brand-900">
              See all doctors <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="reveal-stagger mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? [0, 1, 2].map((i) => <DoctorCardSkeleton key={i} />)
              : featured.map((d) => <DoctorCard key={d.id} doctor={d} />)}
          </div>
          {!loading && featured.length === 0 && (
            <div className="mt-8 rounded-3xl border border-dashed border-brand-200 bg-white p-10 text-center text-gray-600">
              No doctors are open for booking yet — please check back soon.
            </div>
          )}
        </div>
      </section>

      {/* ───────── Specialties ───────── */}
      <section id="specialties" className="cv-auto scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>{content.departmentsEyebrow}</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold text-brand-950 sm:text-4xl">{content.departmentsTitle}</h2>
            <p className="mt-3 text-gray-600">{content.departmentsSubtitle}</p>
          </div>
          <div className="reveal-stagger mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {content.departments.map((d, i) => {
              const Icon = SPECIALTY_ICONS[i % SPECIALTY_ICONS.length];
              return (
                <Link
                  key={d.title}
                  href={`/find-doctors?specialty=${encodeURIComponent(d.title)}`}
                  className="qw-card group flex items-center gap-4 p-4 sm:p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900">{d.title}</span>
                    <span className="hidden truncate text-sm text-gray-600 sm:block">{d.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section id="how" className="qw-hero-bg scroll-mt-20 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow light>{content.careJourneyEyebrow}</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">{content.careJourneyTitle}</h2>
            <p className="mt-3 text-white/70">{content.careJourneySubtitle}</p>
          </div>
          <ol className="reveal-stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {content.careJourneySteps.slice(0, 4).map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <li key={step.title} className="glass-dark relative rounded-3xl p-6">
                  <span className="font-display absolute right-5 top-4 text-5xl font-semibold text-white/10">{i + 1}</span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-400 text-brand-950">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{step.body}</p>
                </li>
              );
            })}
          </ol>
          <div className="mt-10 text-center">
            <Link
              href="/find-doctors"
              className="inline-flex items-center gap-2 rounded-full bg-accent-400 px-7 py-3.5 font-semibold text-brand-950 shadow-lg transition hover:bg-accent-300"
            >
              Find a doctor <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Why Qwesi ───────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <Eyebrow>{content.highlightsEyebrow}</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold text-brand-950 sm:text-4xl">{content.highlightsTitle}</h2>
            <p className="mt-4 text-gray-600">{content.highlightsSubtitle}</p>
            <dl className="reveal-stagger mt-8 grid grid-cols-2 gap-4">
              {content.stats.slice(0, 4).map((s) => (
                <div key={s.label} className="glass rounded-2xl p-4">
                  <dd className="font-display text-3xl font-semibold text-brand-800">{s.value}</dd>
                  <dt className="mt-1 text-sm text-gray-600">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="reveal-stagger grid gap-4 sm:grid-cols-2">
            {content.highlights.map((h) => (
              <div key={h.title} className="qw-card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-gray-900">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{h.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Doctors: join ───────── */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="reveal qw-hero-bg mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-[2rem] p-8 text-white sm:p-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Eyebrow light>For doctors</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">Set your own fee. See patients from anywhere.</h2>
            <p className="mt-4 max-w-xl text-white/75">
              Create your profile, choose your consultation fee and weekly availability, and get booked by patients who have already paid.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/signup/doctor" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-400 px-6 py-3.5 font-semibold text-brand-950 hover:bg-accent-300">
              Join as a doctor <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3.5 font-semibold text-white hover:bg-white/10">
              Doctor login
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Plans ───────── */}
      <section id="plans" className="cv-auto scroll-mt-20 bg-white/20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>{content.subscriptionsEyebrow}</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold text-brand-950 sm:text-4xl">{content.subscriptionsTitle}</h2>
            <p className="mt-3 text-gray-600">{content.subscriptionsSubtitle}</p>
          </div>
          <div className="reveal-stagger mt-10 grid gap-5 md:grid-cols-3">
            {content.subscriptions.map((plan, i) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  i === 1 ? 'border-brand-600 bg-white shadow-xl shadow-brand-900/10 md:-translate-y-2' : 'border-gray-200 bg-white'
                }`}
              >
                {i === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-400 px-3 py-1 text-xs font-bold text-brand-950">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{plan.description}</p>
                <p className="mt-5">
                  <span className="font-display text-4xl font-semibold text-brand-800">{plan.price}</span>{' '}
                  <span className="text-sm text-gray-500">{plan.cadence}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-gray-700">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {b}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup/patient"
                  className={`mt-7 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                    i === 1 ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-brand-200 text-brand-800 hover:bg-brand-50'
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">Prefer not to subscribe? Pay each doctor’s fee only when you book.</p>
        </div>
      </section>

      {/* ───────── Testimonials ───────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>{content.testimonialsEyebrow}</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold text-brand-950 sm:text-4xl">{content.testimonialsTitle}</h2>
          </div>
          <div className="reveal-stagger mt-10 grid gap-5 md:grid-cols-3">
            {content.testimonials.slice(0, 3).map((t) => (
              <figure key={t.quote} className="qw-card flex h-full flex-col p-6">
                <Quote className="h-7 w-7 text-accent-400" />
                <blockquote className="mt-3 flex-1 text-gray-800">{t.quote}</blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold text-gray-900">{t.author}</span>
                  <span className="text-gray-500"> · {t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="cv-auto scroll-mt-20 bg-white/20 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <Eyebrow>{content.faqEyebrow}</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold text-brand-950 sm:text-4xl">{content.faqTitle}</h2>
            <p className="mt-3 text-gray-600">{content.faqSubtitle}</p>
          </div>
          <div className="mt-10 space-y-3">
            {content.faqItems.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.question} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-gray-900"
                  >
                    {f.question}
                    <ChevronDown className={`h-5 w-5 shrink-0 text-brand-600 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <p className="px-5 pb-5 leading-relaxed text-gray-600">{f.answer}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── Contact + CTA ───────── */}
      <section id="contact" className="cv-auto scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="glass rounded-[2rem] p-8 sm:p-10">
            <Eyebrow>{content.contactEyebrow}</Eyebrow>
            <h2 className="font-display mt-2 text-3xl font-semibold text-brand-950">{content.contactTitle}</h2>
            <p className="mt-3 text-gray-700">{content.contactBody}</p>
            <div className="mt-6 space-y-3">
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-3 font-medium text-brand-800 hover:underline">
                  <Mail className="h-5 w-5" /> {email}
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-3 font-medium text-brand-800 hover:underline">
                  <Phone className="h-5 w-5" /> {phone}
                </a>
              )}
              {!email && !phone && <p className="text-sm text-gray-600">Use the chat assistant in the corner for quick help.</p>}
            </div>
          </div>
          <div className="qw-hero-bg flex flex-col justify-center rounded-[2rem] p-8 text-white sm:p-10">
            <h2 className="font-display text-3xl font-semibold">{content.ctaTitle}</h2>
            <p className="mt-3 text-white/75">{content.ctaSubtitle}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/find-doctors" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-400 px-6 py-3.5 font-semibold text-brand-950 hover:bg-accent-300">
                Find a doctor <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/signup/patient" className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3.5 font-semibold hover:bg-white/10">
                Create free account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter settings={settings} content={content} />
      <PublicChat content={content} settings={settings} />
    </div>
  );
}
