'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Calendar, CalendarCheck, Check, Menu, X } from 'lucide-react';
import { useTranslations } from '@/app/hooks/useTranslations';
import type { WebsiteContentData } from '@/lib/defaultWebsiteContent';
import type { LandingSettingsSnapshot } from '@/lib/getLandingSettings';
import { PUBLIC_LANDING_NAV_ITEMS, publicLandingNavLinkClassDark } from '@/lib/publicSiteLandingNav';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import { PublicSiteBrand } from '@/app/components/public-site-brand';
import { PublicLandingChat } from '@/app/components/public-landing-chat';
import { AutoLinkText } from '@/app/components/auto-link-text';
import { countryCodeFromAddressField } from '@/lib/phoneCountryFields';

type PublicDoctor = {
  id: string;
  name: string;
  email: string;
  specialization?: string;
  department?: string;
  slotDurationMinutes?: number;
};

type SlotRow = { time: string; available: boolean };

function PublicBookingHeader({
  brand,
  logoUrl,
  backLabel,
}: {
  brand: string;
  logoUrl: string;
  backLabel: string;
}) {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const signedIn = status === 'authenticated' && session;

  return (
    <header className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0a1614] shadow-md shadow-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0a1614]/88">
      <div className="mx-auto flex h-11 max-w-6xl items-center justify-between gap-2 px-2.5 sm:px-4 lg:h-12">
        <PublicSiteBrand
          brand={brand}
          logoUrl={logoUrl}
          variant="clinical"
          inverse
          href="/#hero"
          showLogoGraphic={false}
          onNavigate={() => setMobileOpen(false)}
        />

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-x-0.5 px-1 xl:flex xl:gap-x-1 2xl:gap-x-1.5" aria-label="Primary">
          {PUBLIC_LANDING_NAV_ITEMS.map(([id, label]) => (
            <Link key={id} href={`/#${id}`} scroll={false} className={publicLandingNavLinkClassDark}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
          <Link
            href="/"
            className="inline-flex max-w-[min(100%,10rem)] items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-teal-50 transition hover:border-teal-400/30 hover:bg-white/10 sm:max-w-none sm:text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{backLabel}</span>
          </Link>
          <LanguageSwitcher flagOnly tone="dark" />
          <button
            type="button"
            className="rounded-lg p-2 text-teal-100/90 transition hover:bg-white/10 hover:text-white xl:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-[#0c1816]/98 px-2.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-xl sm:px-4 xl:hidden">
          <div className="flex flex-col gap-0.5 text-sm">
            <Link
              href="/"
              className="mb-1 rounded-lg py-2.5 text-left font-medium text-teal-100/95 hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
            >
              {backLabel}
            </Link>
            {PUBLIC_LANDING_NAV_ITEMS.map(([id, label]) => (
              <Link
                key={id}
                href={`/#${id}`}
                scroll={false}
                className="rounded-lg py-2.5 text-left font-medium text-teal-100/95 hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href={signedIn ? '/dashboard' : '/login'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
              onClick={() => setMobileOpen(false)}
            >
              {signedIn ? 'Dashboard' : 'Staff portal'}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function RequestAppointmentForm({
  content,
  settings,
}: {
  content: WebsiteContentData;
  settings: LandingSettingsSnapshot;
}) {
  const { t, translationsLoaded } = useTranslations();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({
    doctorId: '',
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    preferredDate: '',
    preferredTime: '',
    department: '',
    reason: '',
    website: '',
  });
  const [patientPath, setPatientPath] = useState<'new' | 'existing'>('existing');
  const [bookingVerificationToken, setBookingVerificationToken] = useState<string | null>(null);
  const [existingPhone, setExistingPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpUiPhase, setOtpUiPhase] = useState<'idle' | 'sending' | 'sent' | 'verifying'>('idle');
  const [otpLocalError, setOtpLocalError] = useState<string | null>(null);
  const [portalPassword, setPortalPassword] = useState('');
  const [portalPasswordConfirm, setPortalPasswordConfirm] = useState('');
  const [patientDateOfBirth, setPatientDateOfBirth] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [portalAccountCreated, setPortalAccountCreated] = useState(false);

  const brand = settings?.systemTitle?.trim() || content.heroTitle;
  const logoUrl = settings?.invoiceLogoUrl?.trim() || '';
  const phoneDefaultCountry = countryCodeFromAddressField(settings?.address?.country);

  const minDate = new Date().toISOString().slice(0, 10);
  const maxBirthDate = minDate;

  useEffect(() => {
    if (!content.appointmentRequestEnabled) return;
    fetch('/api/public/booking/doctors')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDoctors(data);
      })
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, [content.appointmentRequestEnabled]);

  const loadSlots = useCallback(async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const q = new URLSearchParams({ doctorId, date });
      const res = await fetch(`/api/public/booking/slots?${q}`);
      const data = await res.json();
      if (!res.ok) {
        setSlots([]);
        return;
      }
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (form.doctorId && form.preferredDate) {
      setForm((f) => ({ ...f, preferredTime: '' }));
      loadSlots(form.doctorId, form.preferredDate);
    } else {
      setSlots([]);
    }
  }, [form.doctorId, form.preferredDate, loadSlots]);

  const selectPatientPath = (path: 'new' | 'existing') => {
    setPatientPath(path);
    setOtpLocalError(null);
    setBookingVerificationToken(null);
    setOtpCode('');
    setOtpUiPhase('idle');
    setPortalPassword('');
    setPortalPasswordConfirm('');
    setPatientDateOfBirth('');
    setPatientGender('');
    if (path === 'existing') {
      setForm((f) => ({ ...f, patientName: '', patientEmail: '', patientPhone: '' }));
    } else {
      setExistingPhone('');
    }
  };

  const sendOtp = async () => {
    setOtpLocalError(null);
    setOtpUiPhase('sending');
    try {
      const res = await fetch('/api/public/booking/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: existingPhone.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        if (data.error === 'patient_not_found') setOtpLocalError(t('publicAppointment.errPatientNotFound'));
        else if (data.error === 'rate_limited') setOtpLocalError(t('publicAppointment.errRateLimited'));
        else if (data.error === 'sms_unavailable') {
          const detail = typeof data.detail === 'string' && data.detail.trim() ? data.detail.trim() : '';
          const hints: string[] = [];
          if (/permission.*send.*sms|geographic|geo permissions|region indicated/i.test(detail)) {
            hints.push(t('publicAppointment.smsTwilioGeoPermissionHelp'));
          }
          if (/current combination of|cannot be sent with the current combination/i.test(detail)) {
            hints.push(t('publicAppointment.smsTwilioFromToCombinationHelp'));
          }
          const extra = hints.length ? `\n\n${hints.join('\n\n')}` : '';
          setOtpLocalError(
            detail
              ? `${t('publicAppointment.errSmsUnavailable')}: ${detail}${extra}`
              : [t('publicAppointment.errSmsUnavailable'), t('publicAppointment.smsUnavailableHelp')]
                  .filter(Boolean)
                  .join(' ')
          );
        } else setOtpLocalError(t('publicAppointment.error'));
        setOtpUiPhase('idle');
        return;
      }
      setOtpUiPhase('sent');
    } catch {
      setOtpLocalError(t('publicAppointment.error'));
      setOtpUiPhase('idle');
    }
  };

  const verifyOtp = async () => {
    setOtpLocalError(null);
    setOtpUiPhase('verifying');
    try {
      const res = await fetch('/api/public/booking/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: existingPhone.trim(), code: otpCode.replace(/\s/g, '') }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        bookingVerificationToken?: string;
        patient?: { name?: string; email?: string; phone?: string };
      };
      if (!res.ok || !data.bookingVerificationToken) {
        setOtpLocalError(t('publicAppointment.errInvalidOtp'));
        setOtpUiPhase('sent');
        return;
      }
      setBookingVerificationToken(data.bookingVerificationToken);
      setForm((f) => ({
        ...f,
        patientName: data.patient?.name || '',
        patientEmail: data.patient?.email || '',
        patientPhone: data.patient?.phone || existingPhone.trim(),
      }));
      setOtpUiPhase('idle');
    } catch {
      setOtpLocalError(t('publicAppointment.error'));
      setOtpUiPhase('sent');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website.trim()) return;
    if (patientPath === 'existing' && !bookingVerificationToken) {
      setErrorDetail(t('publicAppointment.errInvalidOtp'));
      setStatus('error');
      return;
    }
    if (!form.preferredTime.trim()) {
      setErrorDetail(t('publicAppointment.selectSlot'));
      setStatus('error');
      return;
    }
    const pwTrim = portalPassword.trim();
    if (patientPath === 'new' && pwTrim) {
      if (pwTrim.length < 8) {
        setErrorDetail(t('publicAppointment.errPasswordShort'));
        setStatus('error');
        return;
      }
      if (pwTrim !== portalPasswordConfirm.trim()) {
        setErrorDetail(t('publicAppointment.errPasswordMismatch'));
        setStatus('error');
        return;
      }
      if (!patientDateOfBirth || !patientGender) {
        setErrorDetail(t('publicAppointment.errPortalDobGender'));
        setStatus('error');
        return;
      }
    }
    setErrorDetail(null);
    setStatus('submitting');
    try {
      const res = await fetch('/api/public/appointment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientType: patientPath,
          bookingVerificationToken: patientPath === 'existing' ? bookingVerificationToken : undefined,
          doctorId: form.doctorId,
          patientName: form.patientName,
          patientEmail: form.patientEmail,
          patientPhone: form.patientPhone,
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          department: form.department,
          reason: form.reason,
          website: form.website,
          ...(patientPath === 'new' && pwTrim
            ? {
                portalPassword: pwTrim,
                patientDateOfBirth,
                patientGender,
              }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        portalAccountCreated?: boolean;
      };
      if (!res.ok) {
        setStatus('error');
        setErrorDetail(typeof data.error === 'string' ? data.error : null);
        return;
      }
      setPortalAccountCreated(!!data.portalAccountCreated);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm transition-shadow';

  const doctorSelectCls =
    'w-full h-7 rounded-lg border border-gray-300 bg-white px-2 py-0 text-xs text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm transition-shadow';

  const labelCls = 'block mb-1 text-[11px] font-semibold text-gray-700 sm:text-xs';

  if (!translationsLoaded) {
    return (
      <div className="hospital-landing flex min-h-screen items-center justify-center bg-[#f3f8f7]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!content.appointmentRequestEnabled) {
    return (
      <div className="hospital-landing min-h-screen bg-[#f3f8f7] text-gray-900">
        <PublicBookingHeader brand={brand} logoUrl={logoUrl} backLabel={t('publicAppointment.backHome')} />
        <div className="mx-auto max-w-lg px-4 py-12 text-center sm:py-14">
          <p className="text-sm text-gray-600 leading-snug">{t('publicAppointment.disabled')}</p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('publicAppointment.backHome')}
          </Link>
        </div>
        <PublicLandingChat
          enabled={content.landingChatbotEnabled}
          title={content.landingChatbotTitle?.trim() || 'Ask us'}
          welcomeMessage={content.landingChatWelcome?.trim() || ''}
          phoneDefaultCountry={phoneDefaultCountry}
        />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="hospital-landing min-h-screen bg-[#f3f8f7] text-gray-900">
        <PublicBookingHeader brand={brand} logoUrl={logoUrl} backLabel={t('publicAppointment.backHome')} />
        <div className="mx-auto max-w-lg px-4 py-10 text-center sm:py-14">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 mb-4 shadow-sm">
            <CalendarCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{content.requestAppointmentPageTitle}</h1>
          <p className="mt-3 text-sm text-gray-700 leading-snug whitespace-pre-line">
            <AutoLinkText
              text={content.requestAppointmentSuccessMessage}
              phoneDefaultCountry={phoneDefaultCountry}
              linkClassName="font-medium text-teal-700 underline decoration-teal-600/40 underline-offset-2 hover:text-teal-900 break-all"
            />
          </p>
          <p className="mt-4 text-xs text-gray-500">{t('publicAppointment.successHint')}</p>
          {portalAccountCreated ? (
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs sm:text-sm text-teal-900 text-left max-w-md mx-auto">
              <p>{t('publicAppointment.portalSuccessHint')}</p>
              <Link
                href="/login"
                className="mt-2 inline-block font-semibold text-teal-800 hover:text-teal-950 underline"
              >
                {t('login.title')}
              </Link>
            </div>
          ) : null}
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition-all hover:from-teal-700 hover:to-teal-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('publicAppointment.backHome')}
          </Link>
        </div>
        <PublicLandingChat
          enabled={content.landingChatbotEnabled}
          title={content.landingChatbotTitle?.trim() || 'Ask us'}
          welcomeMessage={content.landingChatWelcome?.trim() || ''}
          phoneDefaultCountry={phoneDefaultCountry}
        />
      </div>
    );
  }

  const sidebarPoints = [
    t('publicAppointment.sidebarPoint1'),
    t('publicAppointment.sidebarPoint2'),
    t('publicAppointment.sidebarPoint3'),
  ];

  return (
    <div className="hospital-landing min-h-screen bg-[#f3f8f7] text-gray-900 selection:bg-teal-100 selection:text-teal-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[20rem] w-[20rem] rounded-full bg-teal-200/25 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[20rem] w-[20rem] rounded-full bg-emerald-100/40 blur-3xl" />
      </div>

      <PublicBookingHeader brand={brand} logoUrl={logoUrl} backLabel={t('publicAppointment.backHome')} />

      <main className="relative z-10 mx-auto max-w-6xl px-3 pb-8 pt-6 sm:px-5 sm:pb-10 sm:pt-8">
        <div className="mb-5 sm:mb-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-100 shadow-sm">
              <Calendar className="h-5 w-5 text-teal-700" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                {content.requestAppointmentPageTitle}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-snug text-gray-600 sm:text-sm">
                {content.requestAppointmentPageSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
          <aside className="order-2 lg:order-1 lg:col-span-4">
            <div className="space-y-3 lg:sticky lg:top-14">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-800">
                  {t('publicAppointment.sidebarTitle')}
                </p>
                <ul className="mt-3 space-y-2">
                  {sidebarPoints.map((text) => (
                    <li key={text} className="flex gap-2 text-xs leading-snug text-gray-600 sm:text-sm">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                      </span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {settings?.systemDescription?.trim() ? (
                <div className="rounded-lg border border-gray-100 bg-teal-50/60 px-3 py-3 text-xs leading-snug text-gray-700 sm:text-sm">
                  <AutoLinkText
                    text={settings.systemDescription.trim()}
                    phoneDefaultCountry={phoneDefaultCountry}
                    linkClassName="font-medium text-teal-800 underline decoration-teal-700/45 underline-offset-2 hover:text-teal-950 break-all"
                  />
                </div>
              ) : null}
            </div>
          </aside>

          <div className="order-1 lg:order-2 lg:col-span-8">
            <form
              onSubmit={submit}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              noValidate
            >
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="sr-only"
                aria-hidden
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />

              <div className="space-y-4 border-b border-gray-100 bg-white p-4 sm:p-5">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{t('publicAppointment.patientPathTitle')}</h2>
                  <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">
                    {patientPath === 'new'
                      ? t('publicAppointment.patientPathNewHint')
                      : t('publicAppointment.patientPathExistingHint')}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => selectPatientPath('existing')}
                    className={`rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      patientPath === 'existing'
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    {t('publicAppointment.patientPathExisting')}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPatientPath('new')}
                    className={`rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      patientPath === 'new'
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    {t('publicAppointment.patientPathNew')}
                  </button>
                </div>

                {patientPath === 'existing' ? (
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                    {bookingVerificationToken ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <p className="text-xs font-semibold text-emerald-900 sm:text-sm">
                          {t('publicAppointment.verifiedIdentity')}
                        </p>
                        <p className="mt-1 text-xs leading-snug text-gray-800 sm:text-sm">
                          <span className="text-gray-500">{t('publicAppointment.verifiedAs')}:</span>{' '}
                          {form.patientName} · {form.patientEmail}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-600">{form.patientPhone}</p>
                        <button
                          type="button"
                          onClick={() => selectPatientPath('new')}
                          className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-900"
                        >
                          {t('publicAppointment.changeToNewPatient')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-600 sm:text-sm">{t('publicAppointment.verifyBeforeScheduleHint')}</p>
                        <div>
                          <label htmlFor="existing-phone" className={labelCls}>
                            {t('publicAppointment.existingPhoneLabel')}
                          </label>
                          <input
                            id="existing-phone"
                            type="tel"
                            autoComplete="tel"
                            className={inputCls}
                            value={existingPhone}
                            onChange={(e) => setExistingPhone(e.target.value)}
                            disabled={otpUiPhase === 'sending' || otpUiPhase === 'verifying'}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={sendOtp}
                          disabled={otpUiPhase === 'sending' || existingPhone.trim().length < 5}
                          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          {otpUiPhase === 'sending' ? t('publicAppointment.sendingOtp') : t('publicAppointment.sendOtp')}
                        </button>
                        {(otpUiPhase === 'sent' || otpUiPhase === 'verifying') && (
                          <div>
                            <label htmlFor="otp-code" className={labelCls}>
                              {t('publicAppointment.otpCodeLabel')}
                            </label>
                            <p className="mb-1.5 text-[11px] text-gray-500">{t('publicAppointment.otpSentHint')}</p>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                              <input
                                id="otp-code"
                                type="text"
                                inputMode="numeric"
                                maxLength={8}
                                autoComplete="one-time-code"
                                className={`${inputCls} sm:max-w-[12rem] tracking-widest font-mono`}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                disabled={otpUiPhase === 'verifying'}
                              />
                              <button
                                type="button"
                                onClick={verifyOtp}
                                disabled={otpCode.length !== 6 || otpUiPhase === 'verifying'}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                              >
                                {otpUiPhase === 'verifying'
                                  ? t('publicAppointment.verifyingOtp')
                                  : t('publicAppointment.verifyOtp')}
                              </button>
                            </div>
                          </div>
                        )}
                        {otpLocalError ? (
                          <p className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-xs whitespace-pre-line text-red-700 sm:text-sm">
                            {otpLocalError}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 border-b border-gray-100 bg-gray-50/50 p-4 sm:p-5">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{t('publicAppointment.sectionSchedule')}</h2>
                  <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">{t('publicAppointment.sectionScheduleHint')}</p>
                </div>
                {patientPath === 'existing' && !bookingVerificationToken ? (
                  <p className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 sm:text-sm">
                    {t('publicAppointment.verifyBeforeScheduleHint')}
                  </p>
                ) : null}

                <div>
                  <label htmlFor="booking-doctor" className={labelCls}>
                    {t('publicAppointment.doctor')}
                  </label>
                  {loadingDoctors ? (
                    <p className="py-1 text-xs text-gray-500 sm:text-sm">{t('publicAppointment.loadingDoctors')}</p>
                  ) : doctors.length === 0 ? (
                    <p
                      className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2.5 text-xs leading-snug text-amber-900 sm:text-sm"
                      role="status"
                    >
                      {t('publicAppointment.noDoctorsOnline')}
                    </p>
                  ) : (
                    <select
                      id="booking-doctor"
                      required
                      className={doctorSelectCls}
                      value={form.doctorId}
                      onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
                    >
                      <option value="">{t('publicAppointment.selectDoctor')}</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                          {d.specialization ? ` — ${d.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="booking-date" className={labelCls}>
                    {t('publicAppointment.preferredDate')}
                  </label>
                  <input
                    id="booking-date"
                    required
                    type="date"
                    min={minDate}
                    className={inputCls}
                    value={form.preferredDate}
                    onChange={(e) => setForm((f) => ({ ...f, preferredDate: e.target.value }))}
                  />
                </div>

                <div>
                  <span className={labelCls}>{t('publicAppointment.chooseSlot')}</span>
                  <div aria-live="polite">
                    {!form.doctorId || !form.preferredDate ? (
                      <p className="text-sm text-gray-500 py-1">{t('publicAppointment.pickDoctorDateFirst')}</p>
                    ) : loadingSlots ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-gray-600 sm:text-sm">
                        <div className="h-4 w-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        {t('publicAppointment.loadingSlots')}
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-gray-500 py-1">{t('publicAppointment.noSlots')}</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5 sm:grid-cols-6">
                        {slots.map((s) => (
                          <button
                            key={s.time}
                            type="button"
                            disabled={!s.available}
                            onClick={() => s.available && setForm((f) => ({ ...f, preferredTime: s.time }))}
                            aria-pressed={form.preferredTime === s.time}
                            className={`rounded-md px-2 py-1.5 text-xs font-medium border transition-all sm:text-sm sm:py-2 ${
                              form.preferredTime === s.time
                                ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-200 shadow-sm'
                                : s.available
                                  ? 'border-gray-200 bg-white text-gray-800 hover:border-teal-300 hover:bg-teal-50/80'
                                  : 'border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                            }`}
                          >
                            {s.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="hidden" name="preferredTime" value={form.preferredTime} readOnly />
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{t('publicAppointment.sectionYourDetails')}</h2>
                  <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">{t('publicAppointment.sectionYourDetailsHint')}</p>
                </div>

                {patientPath === 'existing' && bookingVerificationToken ? (
                  <p className="text-xs text-gray-600 sm:text-sm">
                    {t('publicAppointment.verifiedAs')}: <strong>{form.patientName}</strong> ({form.patientEmail})
                  </p>
                ) : patientPath === 'new' ? (
                  <>
                    <div>
                      <label htmlFor="booking-name" className={labelCls}>
                        {t('publicAppointment.name')}
                      </label>
                      <input
                        id="booking-name"
                        required
                        className={inputCls}
                        value={form.patientName}
                        onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
                        autoComplete="name"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="booking-email" className={labelCls}>
                          {t('publicAppointment.email')}
                        </label>
                        <input
                          id="booking-email"
                          required
                          type="email"
                          className={inputCls}
                          value={form.patientEmail}
                          onChange={(e) => setForm((f) => ({ ...f, patientEmail: e.target.value }))}
                          autoComplete="email"
                        />
                      </div>
                      <div>
                        <label htmlFor="booking-phone" className={labelCls}>
                          {t('publicAppointment.phone')}
                        </label>
                        <input
                          id="booking-phone"
                          required
                          type="tel"
                          className={inputCls}
                          value={form.patientPhone}
                          onChange={(e) => setForm((f) => ({ ...f, patientPhone: e.target.value }))}
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 sm:text-sm">
                          {t('publicAppointment.portalSectionTitle')}
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-snug text-gray-600 sm:text-xs">
                          {t('publicAppointment.portalSectionHint')}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="portal-dob" className={labelCls}>
                            {t('publicAppointment.portalDob')}
                          </label>
                          <input
                            id="portal-dob"
                            type="date"
                            max={maxBirthDate}
                            className={inputCls}
                            value={patientDateOfBirth}
                            onChange={(e) => setPatientDateOfBirth(e.target.value)}
                            autoComplete="bday"
                          />
                        </div>
                        <div>
                          <label htmlFor="portal-gender" className={labelCls}>
                            {t('publicAppointment.portalGender')}
                          </label>
                          <select
                            id="portal-gender"
                            className={inputCls}
                            value={patientGender}
                            onChange={(e) => setPatientGender(e.target.value)}
                          >
                            <option value="">{t('publicAppointment.portalGenderSelect')}</option>
                            <option value="male">{t('publicAppointment.portalGenderMale')}</option>
                            <option value="female">{t('publicAppointment.portalGenderFemale')}</option>
                            <option value="other">{t('publicAppointment.portalGenderOther')}</option>
                            <option value="prefer-not-to-say">{t('publicAppointment.portalGenderPreferNot')}</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="portal-password" className={labelCls}>
                            {t('publicAppointment.portalPassword')}
                          </label>
                          <input
                            id="portal-password"
                            type="password"
                            autoComplete="new-password"
                            className={inputCls}
                            value={portalPassword}
                            onChange={(e) => setPortalPassword(e.target.value)}
                            minLength={8}
                          />
                        </div>
                        <div>
                          <label htmlFor="portal-password-confirm" className={labelCls}>
                            {t('publicAppointment.portalPasswordConfirm')}
                          </label>
                          <input
                            id="portal-password-confirm"
                            type="password"
                            autoComplete="new-password"
                            className={inputCls}
                            value={portalPasswordConfirm}
                            onChange={(e) => setPortalPasswordConfirm(e.target.value)}
                            minLength={8}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 sm:text-sm">{t('publicAppointment.verifyBeforeScheduleHint')}</p>
                )}

                <div>
                  <label htmlFor="booking-dept" className={labelCls}>
                    {t('publicAppointment.department')}
                  </label>
                  <input
                    id="booking-dept"
                    className={inputCls}
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="booking-reason" className={labelCls}>
                    {t('publicAppointment.reason')}
                  </label>
                  <textarea
                    id="booking-reason"
                    rows={3}
                    className={`${inputCls} min-h-[4.75rem] resize-y`}
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  />
                </div>

                {status === 'error' ? (
                  <p
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-800 sm:text-sm"
                    role="alert"
                  >
                    {errorDetail || t('publicAppointment.error')}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={
                      status === 'submitting' ||
                      doctors.length === 0 ||
                      (patientPath === 'existing' && !bookingVerificationToken)
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition-all hover:from-teal-700 hover:to-teal-800 disabled:opacity-60 sm:w-auto"
                  >
                    {status === 'submitting' ? t('publicAppointment.submitting') : t('publicAppointment.submit')}
                  </button>
                  <p className="text-xs text-gray-500 sm:max-w-xs">{t('publicAppointment.sidebarPoint2')}</p>
                </div>
              </div>
            </form>
          </div>
        </div>
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
