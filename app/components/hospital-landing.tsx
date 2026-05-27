'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Stethoscope,
  Heart,
  Shield,
  Activity,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  Quote,
  CalendarClock,
  ChevronDown,
  Sparkles,
  Calendar,
  Clock,
  Lock,
  BookOpen,
  ClipboardList,
  Siren,
  Syringe,
  Baby,
  Microscope,
  Brain,
  Cross,
  Bone,
  Apple,
  Wind,
  HeartHandshake,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { WebsiteContentData } from '@/lib/defaultWebsiteContent';
import { PUBLIC_LANDING_NAV_ITEMS, type PublicLandingNavId } from '@/lib/publicSiteLandingNav';
import type { LandingSettingsSnapshot } from '@/lib/getLandingSettings';
import { countryCodeFromAddressField } from '@/lib/phoneCountryFields';
import type { CountryCode } from 'libphonenumber-js';
import LanguageSwitcher from './LanguageSwitcher';
import { PublicLandingChat } from './public-landing-chat';
import { PublicSiteBrand } from './public-site-brand';
import { AutoLinkText } from './auto-link-text';

export type { LandingSettingsSnapshot };

function addressLines(addr: NonNullable<LandingSettingsSnapshot>['address'] | undefined) {
  if (!addr) return [];
  const lines: string[] = [];
  if (addr.street?.trim()) lines.push(addr.street.trim());
  const cityLine = [addr.city, addr.state].filter((s) => s?.trim()).join(', ');
  const postal = addr.postalCode?.trim() || '';
  if (cityLine && postal) lines.push(`${cityLine} ${postal}`);
  else if (cityLine) lines.push(cityLine);
  else if (postal) lines.push(postal);
  if (addr.country?.trim()) lines.push(addr.country.trim());
  return lines;
}

/** Clickable http(s) / www / mailto / tel in CMS prose */
const linkOnSlateBody =
  'font-medium text-teal-700 underline decoration-teal-600/40 underline-offset-2 hover:text-teal-800 break-all';
const linkOnSlate700 =
  'font-medium text-teal-800 underline decoration-teal-700/40 underline-offset-2 hover:text-teal-950 break-all';
const linkOnHeroBand =
  'font-medium text-white underline decoration-white/55 underline-offset-2 hover:decoration-white break-all';
const linkOnAppointmentBand =
  'font-medium text-teal-200 underline decoration-teal-200/45 underline-offset-2 hover:text-white break-all';
const linkOnStatsLabel =
  'font-medium text-teal-300 underline decoration-teal-400/45 underline-offset-2 hover:text-teal-100 break-all';
const linkOnFooter =
  'font-medium text-teal-400 underline decoration-teal-500/35 underline-offset-2 hover:text-teal-300 break-all';

function SectionHeader({
  title,
  subtitle,
  centered,
  eyebrow,
  phoneDefaultCountry,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
  eyebrow?: string;
  phoneDefaultCountry?: CountryCode;
}) {
  return (
    <div className={centered ? 'mx-auto mb-6 max-w-3xl text-center lg:mb-8' : 'mb-6 max-w-3xl lg:mb-8'}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">{eyebrow}</p>
      ) : null}
      <h2 className="text-balance text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      {subtitle ? (
        <p className="mt-2.5 text-pretty text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base sm:leading-relaxed">
          <AutoLinkText text={subtitle} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
        </p>
      ) : null}
    </div>
  );
}

const cardBase =
  'group rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm shadow-slate-200/25 ring-1 ring-slate-900/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-200/90 hover:shadow-lg hover:shadow-teal-900/8 hover:ring-teal-900/[0.05] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-4';

const SERVICE_ICONS = [Siren, Syringe, Stethoscope, Baby, Microscope, Activity, Brain, ClipboardList] as const;
const DEPT_ICONS = [Heart, Cross, Brain, Bone, Apple, Wind] as const;

/** Icons by pillar index on the trust strip */
const TRUST_PILLAR_ICONS = [Clock, Shield, Lock, BookOpen] as const;
/** Icons by step index on the care journey strip */
const CARE_JOURNEY_ICONS = [Calendar, ClipboardList, Stethoscope, HeartHandshake] as const;

/** ~sticky header height + fudge for scroll-spy / scroll-into-view */
const NAV_SCROLL_LINE_PX = 52;
const NAV_SCROLL_FUZZ_PX = 18;
/** Ignore scroll-driven updates briefly after a nav click so scrollIntoView + rAF don’t restore the wrong item. */
const NAV_SPY_PAUSE_MS = 380;
/** Past this scroll offset, header uses elevated (glass) chrome separate from the hero slab. */
const HEADER_ELEVATE_SCROLL_PX = 8;
const DEFAULT_PUBLIC_BRAND = 'Qwesi AI Virtual Hospital';

/** Gutters align with hero inner column; vertical padding sets section rhythm below the header. */
const LANDING_SECTION_SHELL =
  'relative z-[1] mx-auto w-full max-w-6xl px-2.5 py-10 sm:px-4 sm:py-12 lg:py-14 xl:py-16';
const LANDING_SECTION_SHELL_NARROW =
  'relative z-[1] mx-auto w-full max-w-4xl px-2.5 py-10 sm:px-4 sm:py-12 lg:py-14 xl:py-16';

export function HospitalLanding({
  content,
  settings,
}: {
  content: WebsiteContentData;
  settings: LandingSettingsSnapshot;
}) {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeNavId, setActiveNavId] = useState<PublicLandingNavId | null>(null);
  const [headerElevated, setHeaderElevated] = useState(false);
  const navSpyPausedUntilRef = useRef(0);
  const signedIn = status === 'authenticated' && session;
  const brand = settings?.systemTitle?.trim() || DEFAULT_PUBLIC_BRAND;
  const logoUrl = settings?.invoiceLogoUrl?.trim() || '';
  const heroPhone = settings?.address?.phone?.trim() || '';
  const phoneDefaultCountry = countryCodeFromAddressField(settings?.address?.country);

  const jumpToSection = (id: string) => {
    setMobileOpen(false);
    setSectionsOpen(false);
    if (typeof performance !== 'undefined') {
      navSpyPausedUntilRef.current = performance.now() + NAV_SPY_PAUSE_MS;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    if (PUBLIC_LANDING_NAV_ITEMS.some(([navId]) => navId === id)) {
      setActiveNavId(id as PublicLandingNavId);
    }
  };

  useEffect(() => {
    const navIds = PUBLIC_LANDING_NAV_ITEMS.map(([id]) => id);

    const updateActiveFromScroll = () => {
      if (typeof window !== 'undefined') {
        const elevated = window.scrollY > HEADER_ELEVATE_SCROLL_PX;
        setHeaderElevated((prev) => (prev === elevated ? prev : elevated));
      }
      if (typeof performance !== 'undefined' && performance.now() < navSpyPausedUntilRef.current) return;

      const line = NAV_SCROLL_LINE_PX + NAV_SCROLL_FUZZ_PX;
      let current: PublicLandingNavId | null = null;

      for (const id of navIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const { top, bottom } = el.getBoundingClientRect();
        if (top <= line && bottom > line) {
          current = id;
          break;
        }
      }

      if (current === null) {
        for (const id of navIds) {
          const el = document.getElementById(id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= line) {
            current = id;
          }
        }
      }

      setActiveNavId(current);
    };

    const raw = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';

    if (raw) {
      requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ behavior: 'auto', block: 'start' });
        requestAnimationFrame(updateActiveFromScroll);
      });
    } else {
      updateActiveFromScroll();
    }

    window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveFromScroll);
    return () => {
      window.removeEventListener('scroll', updateActiveFromScroll);
      window.removeEventListener('resize', updateActiveFromScroll);
    };
  }, []);

  return (
    <div className="hospital-landing relative min-h-screen bg-[#f3f8f7] text-slate-900 selection:bg-teal-100 selection:text-teal-950">
      {/* Ambient — calm clinical atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#134e4a08_1px,transparent_1px),linear-gradient(to_bottom,#134e4a06_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -top-40 right-[-15%] h-[min(560px,85vw)] w-[min(560px,85vw)] rounded-full bg-gradient-to-br from-teal-300/25 via-cyan-200/15 to-transparent blur-3xl" />
        <div className="absolute top-[22%] -left-40 h-[480px] w-[480px] rounded-full bg-gradient-to-tr from-emerald-200/20 via-teal-100/15 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[150%] -translate-x-1/2 bg-gradient-to-t from-teal-50/90 via-[#f3f8f7] to-transparent" />
      </div>

      <header
        className={`sticky top-0 z-50 w-full transition-[background-color,box-shadow,backdrop-filter,border-color] duration-200 ${
          headerElevated
            ? 'border-b border-white/10 bg-[#0a1614]/95 shadow-md shadow-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0a1614]/88'
            : 'border-b border-transparent bg-[#0a1614] shadow-none backdrop-blur-none supports-[backdrop-filter]:bg-[#0a1614]'
        }`}
      >
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-2 px-2.5 sm:px-4 lg:h-14">
          <PublicSiteBrand
            brand={brand}
            logoUrl={logoUrl}
            variant="clinical"
            inverse
            href="/#hero"
            onNavigate={() => setMobileOpen(false)}
          />

          <div className="relative hidden shrink-0 lg:block">
            <button
              type="button"
              onClick={() => setSectionsOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 text-sm font-semibold text-teal-50 transition hover:border-white/25 hover:bg-white/10"
              aria-expanded={sectionsOpen}
            >
              Sections
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen ? 'rotate-180' : ''}`} />
            </button>
            {sectionsOpen ? (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0c1816] p-2 shadow-2xl shadow-black/35">
                <div className="grid grid-cols-2 gap-1">
                  {PUBLIC_LANDING_NAV_ITEMS.map(([id, label]) => {
                    const active = activeNavId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => jumpToSection(id)}
                        aria-current={active ? 'true' : undefined}
                        className={`rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${
                          active
                            ? 'bg-teal-500/20 text-white'
                            : 'text-teal-50/90 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {content.appointmentRequestEnabled ? (
              <Link
                href="/request-appointment"
                onClick={() => setMobileOpen(false)}
                className="hidden items-center gap-1 rounded-full bg-gradient-to-r from-teal-600 to-cyan-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-teal-600/25 transition hover:from-teal-500 hover:to-cyan-600 sm:inline-flex sm:text-xs"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="max-w-[9.5rem] truncate lg:max-w-none">
                  {content.appointmentNavLabel?.trim() || content.appointmentSectionButtonLabel?.trim() || 'Book appointment'}
                </span>
              </Link>
            ) : null}
            <LanguageSwitcher flagOnly tone="dark" />
            {signedIn ? (
              <Link
                href="/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1 rounded-full border border-white/15 bg-teal-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-teal-50 shadow-md transition hover:border-teal-400/40 hover:bg-teal-500/25 sm:inline-flex sm:text-xs"
              >
                Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:border-white/30 hover:bg-white/15 sm:inline-flex sm:text-xs"
              >
                Staff portal
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <button
              type="button"
              className="rounded-lg p-2 text-teal-100/90 transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/10 bg-[#0c1816]/98 px-2.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-xl sm:px-4 lg:hidden">
            <div className="flex flex-col gap-0.5 text-sm">
              {content.appointmentRequestEnabled ? (
                <Link
                  href="/request-appointment"
                  className="mb-1.5 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-teal-600 to-cyan-700 py-2 text-xs font-semibold text-white shadow-md shadow-teal-600/30"
                  onClick={() => setMobileOpen(false)}
                >
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                  {content.appointmentNavLabel?.trim() || content.appointmentSectionButtonLabel?.trim() || 'Book appointment'}
                </Link>
              ) : null}
              {PUBLIC_LANDING_NAV_ITEMS.map(([id, label]) => {
                const active = activeNavId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    className={`rounded-lg py-2 pl-3 text-left text-xs transition ${
                      active
                        ? 'border-l-2 border-teal-400 bg-teal-500/15 font-semibold text-white'
                        : 'border-l-2 border-transparent font-medium text-teal-50/90 hover:bg-white/10'
                    }`}
                    onClick={() => jumpToSection(id)}
                  >
                    {label}
                  </button>
                );
              })}
              <Link
                href={signedIn ? '/dashboard' : '/login'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                {signedIn ? 'Dashboard' : 'Staff portal'}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      {content.announcementText?.trim() ? (
        <div className="relative z-10 border-b border-teal-800/25 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 shadow-md shadow-teal-900/15">
          <div className="mx-auto max-w-6xl px-2.5 py-3 text-center text-[11px] font-medium leading-relaxed text-white sm:px-4 sm:py-4 sm:text-xs">
            <AutoLinkText text={content.announcementText.trim()} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnHeroBand} />
          </div>
        </div>
      ) : null}

      <main className="relative z-10 overflow-x-hidden">
        {/* Hero — same shell & typography as Trust / Highlights / About */}
        <section
          id="hero"
          className="relative z-10 flex min-h-[calc(100svh-2.75rem)] flex-col scroll-mt-[3.75rem] overflow-hidden border-b border-white/10 bg-[#0a1614] shadow-[0_4px_30px_-4px_rgba(0,0,0,0.4)] lg:min-h-[calc(100svh-3rem)] lg:scroll-mt-16"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-32 top-1/2 h-[min(420px,70vw)] w-[min(420px,70vw)] -translate-y-1/2 rounded-full bg-teal-500/12 blur-3xl"
            aria-hidden
          />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-44 w-[120%] -translate-x-1/2 bg-gradient-to-t from-teal-950/50 to-transparent" aria-hidden />
          <div className="relative z-[1] mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-2.5 py-6 sm:px-4 sm:py-7">
            <div className="grid gap-5 lg:grid-cols-2 lg:items-center lg:gap-x-6 lg:gap-y-5 xl:gap-x-8">
              <div className="relative flex flex-col">
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <p className="inline-flex w-fit items-center rounded-full border border-teal-500/35 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-teal-200 sm:px-2.5 sm:text-[10px]">
                    {content.heroBadge}
                  </p>
                  <h1 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2.15rem] lg:leading-[1.08]">
                    {content.heroTitle}
                  </h1>
                </div>
                <p className="mt-2.5 max-w-xl border-l-2 border-teal-400/45 pl-3 text-sm leading-snug text-teal-100/85 sm:mt-3 sm:pl-3.5 sm:text-base">
                  <AutoLinkText text={content.heroSubtitle} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnHeroBand} />
                </p>
                <div className="mt-4 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 sm:mt-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {content.appointmentRequestEnabled && content.heroPrimaryLinksAppointment ? (
                    <Link
                      href="/request-appointment"
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-teal-600 to-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-500 hover:to-cyan-600 active:scale-[0.98] motion-reduce:active:scale-100 sm:text-sm"
                    >
                      {content.heroCtaPrimary}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => jumpToSection('contact')}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-teal-600 to-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-500 hover:to-cyan-600 active:scale-[0.98] motion-reduce:active:scale-100 sm:text-sm"
                    >
                      {content.heroCtaPrimary}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  {content.heroCtaSecondary?.trim() ? (
                    <button
                      type="button"
                      onClick={() => jumpToSection('services')}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-sm ring-1 ring-white/10 transition hover:border-white/35 hover:bg-white/10 active:scale-[0.98] motion-reduce:active:scale-100 sm:text-sm"
                    >
                      {content.heroCtaSecondary.trim()}
                    </button>
                  ) : null}
                  {content.appointmentRequestEnabled && !content.heroPrimaryLinksAppointment ? (
                    <Link
                      href="/request-appointment"
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-sm ring-1 ring-white/10 transition hover:border-white/35 hover:bg-white/10 active:scale-[0.98] motion-reduce:active:scale-100 sm:text-sm"
                    >
                      <Calendar className="h-4 w-4 shrink-0 text-teal-300" aria-hidden />
                      {content.appointmentSectionButtonLabel}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="relative lg:pl-1 xl:pl-2">
                {/* Back glow — depth behind the panel */}
                <div
                  className="pointer-events-none absolute -inset-3 rounded-[1.35rem] bg-gradient-to-br from-teal-500/25 via-cyan-500/10 to-transparent opacity-70 blur-2xl sm:-inset-4 lg:opacity-90"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -right-6 top-1/4 hidden h-32 w-32 rounded-full border border-teal-400/20 sm:block"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -left-3 bottom-8 h-16 w-16 rounded-full border border-white/10 sm:h-20 sm:w-20"
                  aria-hidden
                />

                <div className="relative">
                  {content.stats[0]?.value ? (
                    <div className="absolute -top-1.5 right-1.5 z-20 max-w-[10rem] rounded-lg border border-white/20 bg-slate-950/90 px-2 py-1.5 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.5)] backdrop-blur-md sm:-top-2 sm:right-2 sm:max-w-none sm:px-2.5 sm:py-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-teal-300/95">
                        {content.heroStatChipEyebrow?.trim() || 'At a glance'}
                      </p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-white sm:text-xl">
                        {content.stats[0].value}
                      </p>
                      <p className="text-[10px] font-medium leading-snug text-teal-100/70">
                      <AutoLinkText text={content.stats[0].label} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnHeroBand} />
                    </p>
                    </div>
                  ) : null}

                  <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-transparent p-px shadow-[0_16px_40px_-10px_rgba(0,0,0,0.65)] shadow-teal-950/40 ring-1 ring-white/10">
                    <div className="relative overflow-hidden rounded-[0.8125rem] bg-slate-950/60">
                      <div
                        className="pointer-events-none absolute inset-0 z-[1] rounded-[0.8125rem] ring-1 ring-inset ring-white/10"
                        aria-hidden
                      />
                      <div className="group relative aspect-[16/9] w-full overflow-hidden sm:aspect-[16/10]">
                        {content.heroImageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={content.heroImageUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover transition duration-[1.2s] ease-out motion-safe:group-hover:scale-[1.04]"
                            />
                            <div
                              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#0a1614] via-[#0a1614]/20 to-transparent opacity-[0.92]"
                              aria-hidden
                            />
                            <div
                              className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_120%_70%_at_80%_0%,rgba(45,212,191,0.12),transparent_55%)]"
                              aria-hidden
                            />
                            <div
                              className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
                              aria-hidden
                            />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex min-h-0 flex-col bg-gradient-to-br from-slate-900/95 via-[#0d1f1c] to-teal-950/90">
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
                              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-teal-200">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-40 motion-reduce:animate-none" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
                                </span>
                                {content.heroNoImageBadge?.trim() || 'Integrated care'}
                              </div>
                              <p className="text-base font-semibold leading-snug text-white sm:text-lg">
                                {settings?.systemTitle?.trim() || brand}
                              </p>
                              <p className="mt-1.5 text-xs leading-relaxed text-teal-100/75 sm:text-sm">
                                {settings?.systemDescription?.trim() ||
                                  'Acute and planned care on one campus—emergency, surgery, medicine, women’s & children’s health, diagnostics, and rehabilitation.'}
                              </p>
                              <div className="mt-4 space-y-1.5">
                                {(content.heroBullets?.length ? content.heroBullets : []).slice(0, 3).map((line, i) => (
                                  <div
                                    key={i}
                                    className="flex gap-2 text-[11px] leading-relaxed text-teal-100/85 sm:text-xs"
                                  >
                                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                                    <span>{line}</span>
                                  </div>
                                ))}
                                {!content.heroBullets?.length ? (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-rose-400 shadow-md sm:h-10 sm:w-10">
                                      <Heart className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                                    </div>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-400 shadow-md sm:h-10 sm:w-10">
                                      <Shield className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                                    </div>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-400 shadow-md sm:h-10 sm:w-10">
                                      <Activity className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                                    </div>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-cyan-300 shadow-md sm:h-10 sm:w-10">
                                      <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            {heroPhone ? (
                              <a
                                href={`tel:${heroPhone}`}
                                className="mx-2.5 mb-2.5 flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-slate-950/88 px-2.5 py-2 text-left text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md transition hover:border-teal-400/35 hover:bg-slate-950/95 sm:mx-3 sm:mb-3 sm:px-3 sm:py-2.5"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-900/40 sm:h-10 sm:w-10">
                                  <Phone className="h-4 w-4" aria-hidden />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-teal-300/95">
                                    Main line
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs font-semibold sm:text-sm">{heroPhone}</span>
                                </span>
                              </a>
                            ) : null}
                          </div>
                        )}
                        {heroPhone && content.heroImageUrl ? (
                          <a
                            href={`tel:${heroPhone}`}
                            className="absolute bottom-2 left-2 right-2 z-[2] flex items-center gap-2 rounded-lg border border-white/15 bg-slate-950/88 px-2.5 py-2 text-left text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md transition hover:border-teal-400/35 hover:bg-slate-950/95 sm:bottom-3 sm:left-3 sm:right-3 sm:px-3 sm:py-2.5"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-900/40 sm:h-10 sm:w-10">
                              <Phone className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-teal-300/95">
                                Main line
                              </span>
                              <span className="mt-0.5 block truncate text-xs font-semibold sm:text-sm">{heroPhone}</span>
                            </span>
                          </a>
                        ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Intent dock */}
            <div className="mt-5 sm:mt-6">
              <div className="rounded-lg border border-white/10 bg-slate-950/55 p-2.5 shadow-xl shadow-black/30 ring-1 ring-white/5 backdrop-blur-xl sm:p-3">
                <p className="mb-2 text-center text-[9px] font-bold uppercase tracking-[0.26em] text-teal-300/90 sm:text-left sm:text-[10px]">
                  I need to…
                </p>
                <div className="flex flex-nowrap items-center justify-start gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
                  {content.appointmentRequestEnabled ? (
                    <Link
                      href="/request-appointment"
                      className="inline-flex items-center gap-1 rounded-full border border-teal-400/35 bg-teal-500/20 px-3 py-1.5 text-[11px] font-semibold text-teal-50 transition hover:border-teal-300/50 hover:bg-teal-500/30 sm:text-xs"
                    >
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-teal-200" aria-hidden />
                      Book a visit
                    </Link>
                  ) : null}
                  {heroPhone ? (
                    <a
                      href={`tel:${heroPhone}`}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition hover:border-teal-400/35 hover:bg-white/10 sm:text-xs"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden />
                      Call the hospital
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => jumpToSection('visit')}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition hover:border-teal-400/35 hover:bg-white/10 sm:text-xs"
                  >
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden />
                    Visiting hours
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToSection('services')}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition hover:border-teal-400/35 hover:bg-white/10 sm:text-xs"
                  >
                    <Stethoscope className="h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden />
                    Browse services
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToSection('faq')}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition hover:border-teal-400/35 hover:bg-white/10 sm:text-xs"
                  >
                    <HelpCircle className="h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden />
                    FAQ
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToSection('contact')}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition hover:border-teal-400/35 hover:bg-white/10 sm:text-xs"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden />
                    Map &amp; contact
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToSection('urgent-help')}
                    className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-950/40 px-3 py-1.5 text-[11px] font-semibold text-red-100 transition hover:border-red-400/60 hover:bg-red-950/60 sm:text-xs"
                  >
                    <Siren className="h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden />
                    Emergency info
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust pillars */}
        <section
          className={`relative z-10 border-b border-teal-900/10 bg-[#f3f8f7]/90`}
        >
          <div className={LANDING_SECTION_SHELL}>
            {content.trustPillarsTitle?.trim() ? (
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.22em] text-teal-800 sm:mb-5">
                {content.trustPillarsTitle.trim()}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3.5">
              {content.trustPillars.map((pillar, i) => {
                const Icon = TRUST_PILLAR_ICONS[i % TRUST_PILLAR_ICONS.length];
                const key = pillar.title?.trim() || `pillar-${i}`;
                return (
                  <div
                    key={key}
                    className="flex gap-2.5 rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-sm shadow-slate-200/30 ring-1 ring-slate-900/[0.03] transition duration-300 hover:-translate-y-0.5 hover:border-teal-200/70 hover:shadow-md hover:shadow-teal-900/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-md shadow-teal-600/25">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{pillar.title}</p>
                      <p className="mt-0.5 text-xs leading-snug text-slate-600">
                        <AutoLinkText text={pillar.subtitle} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className={`relative border-y border-slate-800/80 bg-slate-950 text-white`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_-40%,rgba(20,184,166,0.32),transparent)]" />
          <div className={LANDING_SECTION_SHELL}>
            {content.statsEyebrow?.trim() ? (
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.22em] text-teal-300/95 sm:mb-6">
                {content.statsEyebrow.trim()}
              </p>
            ) : null}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-inner shadow-black/20 backdrop-blur-sm sm:p-6 lg:p-7">
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-5">
                {content.stats.map((s, i) => (
                  <div
                    key={i}
                    className="relative text-center lg:border-l lg:border-white/10 lg:pl-5 lg:first:border-l-0 lg:first:pl-0"
                  >
                    <p className="text-2xl font-semibold tracking-tight text-white tabular-nums sm:text-3xl">{s.value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
                      <AutoLinkText text={s.label} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnStatsLabel} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section
          id="highlights"
          className={`scroll-mt-16 border-b border-slate-200/80 bg-white`}
        >
          <div className={LANDING_SECTION_SHELL}>
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-lg shadow-teal-600/30">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  {content.highlightsEyebrow?.trim() ? (
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                      {content.highlightsEyebrow.trim()}
                    </p>
                  ) : null}
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {content.highlightsTitle}
                  </h2>
                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
                    <AutoLinkText text={content.highlightsSubtitle} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-4">
              {content.highlights.map((h, i) => (
                <div key={i} className={cardBase}>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-800 ring-1 ring-teal-200/80">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="mb-2 h-1 w-9 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600" />
                  <h3 className="text-base font-semibold text-slate-900">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    <AutoLinkText text={h.description} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className={`scroll-mt-16`}>
          <div className={LANDING_SECTION_SHELL}>
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">About</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{content.aboutTitle}</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:mt-4 sm:text-base">
                  <AutoLinkText text={content.aboutBody} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                </p>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-teal-100/90 bg-gradient-to-br from-teal-50/80 via-white to-cyan-50/40 p-5 shadow-lg shadow-teal-900/5 sm:p-6">
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl" />
                <h3 className="relative text-base font-semibold text-teal-950 sm:text-lg">{content.missionTitle}</h3>
                <p className="relative mt-2.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 sm:mt-3">
                  <AutoLinkText text={content.missionBody} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlate700} />
                </p>
              </div>
            </div>

            <div className="mt-12 border-t border-slate-200/70 pt-12 sm:mt-14 sm:pt-14">
              <SectionHeader title={content.valuesTitle} centered phoneDefaultCountry={phoneDefaultCountry} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3.5">
                {content.values.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] transition hover:border-teal-200/80 hover:shadow-md"
                  >
                    <h4 className="text-sm font-semibold text-slate-900">{v.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      <AutoLinkText text={v.description} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section
          id="services"
          className={`scroll-mt-16 border-t border-slate-200/80 bg-slate-50/80`}
        >
          <div className={LANDING_SECTION_SHELL}>
            <SectionHeader
              title={content.servicesTitle}
              subtitle={content.servicesSubtitle}
              eyebrow={content.servicesEyebrow?.trim() || undefined}
              phoneDefaultCountry={phoneDefaultCountry}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-3.5">
              {content.services.map((s, i) => {
                const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
                return (
                  <div key={i} className={cardBase}>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-600/30">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      <AutoLinkText text={s.description} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                    </p>
                    <span className="mt-3 inline-flex items-center text-sm font-semibold text-teal-700 opacity-0 transition group-hover:opacity-100">
                      Learn more <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Subscriptions */}
        {content.subscriptions?.length ? (
          <section id="subscriptions" className="scroll-mt-16 border-t border-slate-200/80 bg-white">
            <div className={LANDING_SECTION_SHELL}>
              <SectionHeader
                title={content.subscriptionsTitle}
                subtitle={content.subscriptionsSubtitle}
                eyebrow={content.subscriptionsEyebrow?.trim() || undefined}
                centered
                phoneDefaultCountry={phoneDefaultCountry}
              />
              <div className="grid gap-3 md:grid-cols-3">
                {content.subscriptions.slice(0, 3).map((plan, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm ring-1 ring-slate-900/[0.02]"
                  >
                    <div className="min-h-[8rem]">
                      <p className="text-sm font-semibold text-teal-700">{plan.name}</p>
                      <div className="mt-2 flex items-end gap-1">
                        <span className="text-2xl font-bold tracking-tight text-slate-950">{plan.price}</span>
                        {plan.cadence ? <span className="pb-1 text-xs font-medium text-slate-500">{plan.cadence}</span> : null}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        <AutoLinkText text={plan.description} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                      </p>
                    </div>
                    <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                      {(plan.benefits || []).filter(Boolean).slice(0, 6).map((benefit, benefitIndex) => (
                        <li key={benefitIndex} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-teal-200 bg-white px-3 text-sm font-semibold text-teal-800 shadow-sm"
                      disabled
                    >
                      Payment coming soon
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Departments */}
        <section id="departments" className={`scroll-mt-16`}>
          <div className={LANDING_SECTION_SHELL}>
            <SectionHeader
              title={content.departmentsTitle}
              subtitle={content.departmentsSubtitle}
              eyebrow={content.departmentsEyebrow?.trim() || undefined}
              phoneDefaultCountry={phoneDefaultCountry}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
              {content.departments.map((d, i) => {
              const Icon = DEPT_ICONS[i % DEPT_ICONS.length];
              return (
                <div
                  key={i}
                  className="group flex gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-900/[0.02] transition duration-300 hover:-translate-y-0.5 hover:border-teal-200/90 hover:shadow-lg hover:shadow-teal-900/8 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-teal-700 ring-1 ring-slate-200/80 transition group-hover:bg-teal-50 group-hover:ring-teal-200/60">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{d.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      <AutoLinkText text={d.description} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                    </p>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </section>

        {/* Featured providers */}
        {content.providers?.length ? (
          <section
            id="providers"
            className="scroll-mt-16 border-t border-slate-200/80 bg-white"
          >
            <div className={LANDING_SECTION_SHELL}>
              <SectionHeader
                title={content.providersTitle}
                subtitle={content.providersSubtitle}
                eyebrow={content.providersEyebrow?.trim() || undefined}
                centered
                phoneDefaultCountry={phoneDefaultCountry}
              />
              <div className="grid gap-4 md:grid-cols-3">
                {content.providers.map((provider, i) => {
                  const initials = provider.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <article
                      key={`${provider.name}-${i}`}
                      className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 shadow-sm ring-1 ring-slate-900/[0.02] transition duration-300 hover:-translate-y-0.5 hover:border-teal-200/80 hover:bg-white hover:shadow-lg hover:shadow-teal-900/8 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <div className="aspect-[4/3] bg-gradient-to-br from-teal-100 via-cyan-50 to-slate-100">
                        {provider.imageUrl?.trim() ? (
                          <img
                            src={provider.imageUrl.trim()}
                            alt={provider.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-xl font-semibold text-teal-800 shadow-sm ring-1 ring-teal-100">
                              {initials || 'DR'}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-base font-semibold text-slate-950">{provider.name}</h3>
                        {provider.role?.trim() ? (
                          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-teal-700">{provider.role}</p>
                        ) : null}
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          <AutoLinkText text={provider.bio} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* Care journey */}
        <section
          id="care-journey"
          className={`scroll-mt-16 border-t border-slate-200/80 bg-gradient-to-b from-teal-50/60 via-[#f3f8f7] to-white`}
        >
          <div className={LANDING_SECTION_SHELL}>
            <div className="mx-auto mb-6 max-w-3xl text-center lg:mb-8">
              {content.careJourneyEyebrow?.trim() ? (
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-800">{content.careJourneyEyebrow.trim()}</p>
              ) : null}
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{content.careJourneyTitle}</h2>
              <p className="mt-2.5 text-pretty text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
                <AutoLinkText text={content.careJourneySubtitle} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-3.5 lg:grid-cols-4">
              {content.careJourneySteps.map((step, i) => {
                const Icon = CARE_JOURNEY_ICONS[i % CARE_JOURNEY_ICONS.length];
                const key = step.title?.trim() || `step-${i}`;
                return (
                  <div
                    key={key}
                    className="relative rounded-xl border border-teal-100/90 bg-white/95 p-3 shadow-md shadow-teal-900/[0.06] ring-1 ring-slate-900/[0.03] transition duration-300 hover:-translate-y-0.5 hover:border-teal-200/80 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-lg shadow-teal-600/25">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-xs font-bold text-teal-700">Step {i + 1}</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      <AutoLinkText text={step.body} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Visit */}
        <section id="visit" className={`scroll-mt-16 border-t border-slate-200/80 bg-white`}>
          <div className={LANDING_SECTION_SHELL}>
            <div className="mb-6 flex items-start gap-3 lg:mb-8">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80">
                <CalendarClock className="h-4 w-4" aria-hidden />
              </span>
              <div>
                {content.visitEyebrow?.trim() ? (
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{content.visitEyebrow.trim()}</p>
                ) : null}
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{content.visitTitle}</h2>
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
                  <AutoLinkText text={content.visitSubtitle} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-3.5">
              {content.visitRows.map((row, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm ring-1 ring-slate-900/[0.02] transition hover:border-teal-200/60 hover:shadow-md sm:flex-row sm:items-baseline sm:gap-3"
                >
                  <span className="shrink-0 text-sm font-semibold text-teal-900 sm:w-40">{row.label}</span>
                  <span className="text-sm leading-relaxed text-slate-600">
                    <AutoLinkText text={row.value} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section
          id="stories"
          className={`scroll-mt-16 border-t border-slate-200/80 bg-gradient-to-b from-slate-50 to-white`}
        >
          <div className={LANDING_SECTION_SHELL}>
            <SectionHeader
              title={content.testimonialsTitle}
              centered
              eyebrow={content.testimonialsEyebrow?.trim() || undefined}
              phoneDefaultCountry={phoneDefaultCountry}
            />
            <div className="grid gap-3 md:grid-cols-3 md:gap-4">
              {content.testimonials.map((story, i) => (
                <blockquote
                  key={i}
                  className="relative flex h-full flex-col rounded-xl border border-slate-200/80 bg-white p-4 pt-8 shadow-sm ring-1 ring-slate-900/[0.02] transition duration-300 hover:-translate-y-0.5 hover:border-teal-200/70 hover:shadow-lg hover:shadow-teal-900/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <Quote className="absolute left-3 top-3 h-7 w-7 text-teal-200/90" aria-hidden />
                  <p className="relative z-10 flex-1 text-sm leading-relaxed text-slate-700">
                    &ldquo;
                    <AutoLinkText text={story.quote} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlate700} />
                    &rdquo;
                  </p>
                  <footer className="mt-4 border-t border-slate-100 pt-3">
                    <cite className="not-italic text-sm font-semibold text-slate-900">{story.author}</cite>
                    {story.role?.trim() ? (
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-500">{story.role}</p>
                    ) : null}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`scroll-mt-16 border-t border-slate-200/80 bg-white`}>
          <div className={LANDING_SECTION_SHELL_NARROW}>
            <SectionHeader
              title={content.faqTitle}
              subtitle={content.faqSubtitle}
              centered
              eyebrow={content.faqEyebrow?.trim() || undefined}
              phoneDefaultCountry={phoneDefaultCountry}
            />
            <div className="space-y-2">
              {content.faqItems.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div
                    key={i}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm ring-1 transition duration-200 ${
                      open
                        ? 'border-teal-300/60 shadow-md shadow-teal-900/10 ring-teal-900/[0.06]'
                        : 'border-slate-200/80 ring-slate-900/[0.02] hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold transition sm:px-4 sm:py-4 sm:text-sm ${
                        open ? 'bg-teal-50/40 text-slate-900' : 'text-slate-900 hover:bg-slate-50/80'
                      }`}
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                          open ? 'rotate-180' : ''
                        }`}
                        aria-hidden
                      />
                    </button>
                    {open ? (
                      <div className="border-t border-teal-200/50 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-600 sm:py-4">
                        <AutoLinkText text={item.answer} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Appointment */}
        {content.appointmentRequestEnabled ? (
          <section
            id="appointment"
            className={`relative scroll-mt-16 overflow-hidden border-t border-teal-950/50 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-950 text-white`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_70%_20%,rgba(45,212,191,0.2),transparent)]" />
            <div
              className={`${LANDING_SECTION_SHELL} flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8`}
            >
              <div className="max-w-xl">
                {content.appointmentSectionEyebrow?.trim() ? (
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
                    {content.appointmentSectionEyebrow.trim()}
                  </p>
                ) : null}
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{content.appointmentSectionTitle}</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300 sm:mt-3 sm:text-base">
                  <AutoLinkText text={content.appointmentSectionSubtitle} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnAppointmentBand} />
                </p>
              </div>
              <Link
                href="/request-appointment"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-xl shadow-black/20 transition hover:bg-teal-50 sm:px-5 sm:py-2.5"
              >
                <Calendar className="h-4 w-4" aria-hidden />
                {content.appointmentSectionButtonLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>
        ) : null}

        {/* Contact */}
        <section id="contact" className={`scroll-mt-16 border-t border-slate-200/80 bg-slate-50`}>
          <div className={`${LANDING_SECTION_SHELL} grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10`}>
            <div>
              {content.contactEyebrow?.trim() ? (
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">{content.contactEyebrow.trim()}</p>
              ) : null}
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{content.contactTitle}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:mt-4 sm:text-base">
                <AutoLinkText text={content.contactBody} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
              </p>
              {content.useSettingsContact && settings?.address ? (
                <div className="mt-5 space-y-2.5 text-sm text-slate-700">
                  {addressLines(settings.address).map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal-500" />
                      <span>
                        <AutoLinkText text={line} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnSlateBody} />
                      </span>
                    </div>
                  ))}
                  {settings.address.phone?.trim() ? (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 shrink-0 text-teal-500" />
                      <a href={`tel:${settings.address.phone}`} className="font-semibold text-teal-700 hover:text-teal-600">
                        {settings.address.phone}
                      </a>
                    </div>
                  ) : null}
                  {settings.address.email?.trim() ? (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 shrink-0 text-teal-500" />
                      <a href={`mailto:${settings.address.email}`} className="font-semibold text-teal-700 hover:text-teal-600">
                        {settings.address.email}
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg shadow-slate-300/25 ring-1 ring-slate-900/[0.04]">
              {content.mapEmbedUrl?.trim().startsWith('https://') ? (
                <iframe
                  title="Map"
                  src={content.mapEmbedUrl.trim()}
                  className="min-h-[200px] w-full border-0 lg:min-h-[260px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <div className="flex min-h-[180px] items-center justify-center bg-slate-100/80 p-4">
                  <p className="max-w-sm text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
                    Add a map embed URL in Admin → Hospital website to show an interactive map. Contact details can use
                    your organisation settings when enabled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section
          id="urgent-help"
          className={`relative scroll-mt-16 overflow-hidden border-t border-teal-900/30 bg-gradient-to-r from-teal-800 via-teal-600 to-cyan-700`}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-60" />
          <div className={`${LANDING_SECTION_SHELL_NARROW} text-center`}>
            <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{content.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-teal-100 sm:mt-3.5 sm:text-base">
              <AutoLinkText text={content.ctaSubtitle} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnHeroBand} />
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800 bg-slate-950 py-10 text-slate-400 sm:py-12 lg:py-14">
          <div className="mx-auto max-w-6xl px-2.5 sm:px-4">
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 font-semibold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-800">
                    <Stethoscope className="h-3.5 w-3.5 text-white" aria-hidden />
                  </span>
                  {brand}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  <AutoLinkText text={content.footerTagline} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnFooter} />
                </p>
              </div>
              {(content.footerColumns || []).map((col, i) => (
                <div key={i}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{col.title}</h4>
                  <ul className="mt-2 space-y-1.5">
                    {col.lines.map((line, j) => (
                      <li key={j} className="text-sm text-slate-400">
                        <AutoLinkText text={line} phoneDefaultCountry={phoneDefaultCountry} linkClassName={linkOnFooter} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-800 pt-8 text-xs sm:flex-row sm:items-center">
              <span>
                © {new Date().getFullYear()} {brand}. All rights reserved.
              </span>
              <Link
                href="/login"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-500 transition hover:text-white"
              >
                Staff portal
              </Link>
            </div>
          </div>
        </footer>
      </main>

      <PublicLandingChat
        enabled={content.landingChatbotEnabled}
        title={content.landingChatbotTitle?.trim() || 'Ask us'}
        welcomeMessage={content.landingChatWelcome?.trim() || ''}
        phoneDefaultCountry={phoneDefaultCountry}
      />
    </div>
  );
}
