'use client';

import { LogoLink } from './logo';
import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, Menu, Stethoscope, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { PublicLandingChat } from './public-landing-chat';
import type { LandingSettingsSnapshot } from '@/lib/getLandingSettings';
import type { WebsiteContentData } from '@/lib/defaultWebsiteContent';

const NAV: { href: string; label: string }[] = [
  { href: '/find-doctors', label: 'Find a doctor' },
  { href: '/#specialties', label: 'Specialties' },
  { href: '/#how', label: 'How it works' },
  { href: '/#plans', label: 'Plans' },
  { href: '/#faq', label: 'FAQ' },
];

export function brandName(settings: LandingSettingsSnapshot) {
  return settings?.systemTitle?.trim() || 'Qwesi';
}

export function BrandMark({ inverse = false }: { settings?: LandingSettingsSnapshot; inverse?: boolean }) {
  return <LogoLink tone={inverse ? 'dark' : 'light'} className="h-8 sm:h-9" priority />;
}

export function PublicHeader({
  settings,
  tone = 'light',
}: {
  settings: LandingSettingsSnapshot;
  /** `dark` sits on top of the dark hero; `light` is a solid bar for inner pages */
  tone?: 'light' | 'dark';
}) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const signedIn = status === 'authenticated' && !!session;
  // Header is always a solid white bar so the logo's white background blends in on every page.
  const dark = false;
  void tone;
  const home =
    session?.user?.role === 'patient' ? '/patient-portal' : session?.user?.role === 'pharmacy' ? '/pharmacy' : '/dashboard';

  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        'border-brand-100 !bg-white shadow-[0_4px_24px_rgba(76,48,190,0.08)]'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <BrandMark settings={settings} inverse={dark} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                dark ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher flagOnly tone={dark ? 'dark' : 'default'} compact />
          </div>
          {signedIn ? (
            <Link
              href={home}
              className="hidden items-center gap-1.5 rounded-full bg-accent-400 px-4 py-2 text-sm font-semibold text-brand-950 shadow-sm transition hover:bg-accent-300 sm:inline-flex"
            >
              My portal <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={`hidden rounded-full px-4 py-2 text-sm font-semibold transition sm:inline-flex ${
                  dark ? 'text-white hover:bg-white/10' : 'text-brand-800 hover:bg-brand-50'
                }`}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden items-center rounded-full bg-accent-400 px-4 py-2 text-sm font-semibold text-brand-950 shadow-sm transition hover:bg-accent-300 sm:inline-flex"
              >
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl lg:hidden ${
              dark ? 'text-white hover:bg-white/10' : 'text-brand-900 hover:bg-brand-50'
            }`}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className={`border-t lg:hidden ${dark ? 'border-white/10 bg-brand-950' : 'border-brand-100 bg-white'}`}>
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-3 text-base font-medium ${
                  dark ? 'text-white hover:bg-white/10' : 'text-gray-800 hover:bg-brand-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {signedIn ? (
                <Link
                  href={home}
                  onClick={() => setOpen(false)}
                  className="col-span-2 rounded-xl bg-accent-400 px-4 py-3 text-center font-semibold text-brand-950"
                >
                  My portal
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={`rounded-xl border px-4 py-3 text-center font-semibold ${
                      dark ? 'border-white/25 text-white' : 'border-brand-200 text-brand-800'
                    }`}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-accent-400 px-4 py-3 text-center font-semibold text-brand-950"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
            <div className="mt-2 flex justify-end sm:hidden">
              <LanguageSwitcher flagOnly tone={dark ? 'dark' : 'default'} compact />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function PublicFooter({
  settings,
  content,
}: {
  settings: LandingSettingsSnapshot;
  content: WebsiteContentData;
}) {
  const email = settings?.address?.email?.trim();
  const phone = settings?.address?.phone?.trim();
  return (
    <footer className="border-t border-brand-100 !bg-white text-gray-600">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <BrandMark settings={settings} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-600">{content.footerTagline}</p>
          {(email || phone) && (
            <div className="mt-4 space-y-1 text-sm">
              {email && (
                <p>
                  <a className="hover:text-brand-700" href={`mailto:${email}`}>
                    {email}
                  </a>
                </p>
              )}
              {phone && (
                <p>
                  <a className="hover:text-brand-700" href={`tel:${phone}`}>
                    {phone}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
        {content.footerColumns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-950">{col.title}</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {col.lines.map((line) => {
                const l = line.toLowerCase();
                const href = l.includes('find a doctor')
                  ? '/find-doctors'
                  : l.includes('how it works')
                    ? '/#how'
                    : l.includes('portal') || l.includes('login')
                      ? '/login'
                      : l.includes('join') || l.includes('fee')
                        ? '/signup'
                        : null;
                return (
                  <li key={line}>
                    {href ? (
                      <Link href={href} className="hover:text-brand-700">
                        {line}
                      </Link>
                    ) : (
                      <span>{line}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-brand-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {brandName(settings)}. All rights reserved.
          </p>
          <p>Virtual care is not for emergencies. In an emergency, call your local emergency number.</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicChat({ content, settings }: { content: WebsiteContentData; settings: LandingSettingsSnapshot }) {
  return (
    <PublicLandingChat
      enabled={content.landingChatbotEnabled}
      title={content.landingChatbotTitle}
      welcomeMessage={content.landingChatWelcome}
    />
  );
}
