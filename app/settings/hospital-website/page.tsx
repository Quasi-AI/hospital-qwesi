'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Globe,
  Shield,
  LayoutList,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  ImageIcon,
  ExternalLink,
  Users,
} from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import type { WebsiteContentData } from '@/lib/defaultWebsiteContent';

function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
const cls =
    'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500';
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      {hint ? <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      role="tabpanel"
      aria-label={title}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p> : null}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

const PROVIDER_IMAGE_MAX_BYTES = 900 * 1024;
const PROVIDER_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export default function HospitalWebsiteCMSPage() {
  const { t, translationsLoaded } = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<WebsiteContentData | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [activeSection, setActiveSection] = useState<string>('cms-hero');

  const navItems = useMemo(
    () =>
      [
        { id: 'cms-hero', label: t('settings.hospitalWebsiteSectionHero') },
        { id: 'cms-announcement', label: t('settings.hospitalWebsiteSectionAnnouncement') },
        { id: 'cms-trust-pillars', label: t('settings.hospitalWebsiteSectionTrustPillars') },
        { id: 'cms-highlights', label: t('settings.hospitalWebsiteSectionHighlights') },
        { id: 'cms-about', label: t('settings.hospitalWebsiteSectionAbout') },
        { id: 'cms-stats', label: t('settings.hospitalWebsiteSectionStats') },
        { id: 'cms-services', label: t('settings.hospitalWebsiteSectionServices') },
        { id: 'cms-subscriptions', label: 'Subscriptions' },
        { id: 'cms-departments', label: t('settings.hospitalWebsiteSectionDepartments') },
        { id: 'cms-providers', label: 'Providers' },
        { id: 'cms-care-journey', label: t('settings.hospitalWebsiteSectionCareJourney') },
        { id: 'cms-visit', label: t('settings.hospitalWebsiteSectionVisit') },
        { id: 'cms-testimonials', label: t('settings.hospitalWebsiteSectionTestimonials') },
        { id: 'cms-faq', label: t('settings.hospitalWebsiteSectionFaq') },
        { id: 'cms-appointment', label: t('settings.hospitalWebsiteSectionAppointment') },
        { id: 'cms-contact', label: t('settings.hospitalWebsiteSectionContact') },
        { id: 'cms-footer', label: t('settings.hospitalWebsiteSectionFooter') },
      ] as const,
    [t]
  );

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetch('/api/website')
      .then((r) => r.json())
      .then((data: WebsiteContentData) => {
        setForm(data);
        setJsonText(JSON.stringify(data, null, 2));
      })
      .catch(() => setMessage({ type: 'err', text: 'Failed to load' }));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('section') === 'providers') {
      setActiveSection('cms-providers');
    }
  }, []);

  const update = (patch: Partial<WebsiteContentData>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updatePair = (
    key: 'values' | 'services' | 'departments' | 'highlights',
    index: number,
    field: 'title' | 'description',
    val: string
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...prev[key]];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, [key]: arr };
    });
  };

  const updateStat = (index: number, field: 'label' | 'value', val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...prev.stats];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, stats: arr };
    });
  };

  const updateVisitRow = (index: number, field: 'label' | 'value', val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...prev.visitRows];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, visitRows: arr };
    });
  };

  const updateFaq = (index: number, field: 'question' | 'answer', val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...prev.faqItems];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, faqItems: arr };
    });
  };

  const updateTestimonial = (index: number, field: 'quote' | 'author' | 'role', val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...prev.testimonials];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, testimonials: arr };
    });
  };

  const updateProvider = (index: number, field: 'name' | 'role' | 'bio' | 'imageUrl', val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...(prev.providers ?? [])];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, providers: arr };
    });
  };

  const updateSubscription = (
    index: number,
    field: 'name' | 'price' | 'cadence' | 'description' | 'benefits',
    val: string | string[]
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...(prev.subscriptions ?? [])];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, subscriptions: arr };
    });
  };

  const addProvider = () => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            providers: [...(prev.providers ?? []), { name: '', role: '', bio: '', imageUrl: '' }],
          }
        : prev
    );
  };

  const removeProvider = (index: number) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            providers: (prev.providers ?? []).filter((_, i) => i !== index),
          }
        : prev
    );
  };

  const handleProviderImageFile = (index: number, file: File | undefined) => {
    if (!file) return;
    if (!PROVIDER_IMAGE_TYPES.includes(file.type)) {
      setMessage({ type: 'err', text: 'Provider photo must be PNG, JPG, GIF, or WebP.' });
      return;
    }
    if (file.size > PROVIDER_IMAGE_MAX_BYTES) {
      setMessage({ type: 'err', text: 'Provider photo must be smaller than 900 KB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProvider(index, 'imageUrl', reader.result);
        setMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateTrustPillar = (index: number, field: 'title' | 'subtitle', val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...prev.trustPillars];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, trustPillars: arr };
    });
  };

  const updateCareStep = (index: number, field: 'title' | 'body', val: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const arr = [...prev.careJourneySteps];
      arr[index] = { ...arr[index], [field]: val };
      return { ...prev, careJourneySteps: arr };
    });
  };

  const handleSave = async () => {
    let payload: WebsiteContentData;
    if (showJson) {
      try {
        payload = JSON.parse(jsonText) as WebsiteContentData;
      } catch {
        setMessage({ type: 'err', text: 'Invalid JSON' });
        return;
      }
    } else {
      if (!form) return;
      payload = form;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/website', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm(data.content);
      setJsonText(JSON.stringify(data.content, null, 2));
      setMessage({ type: 'ok', text: t('settings.hospitalWebsiteSaved') });
    } catch {
      setMessage({ type: 'err', text: t('settings.error') });
    } finally {
      setSaving(false);
    }
  };

  if (!translationsLoaded || status === 'loading') {
    return (
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (session?.user?.role !== 'admin') {
    return null;
  }

  if (!form) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('settings.hospitalWebsite')} description="" dense>
          <p className="text-gray-600">{t('common.loading')}</p>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('settings.hospitalWebsite')} description={t('settings.hospitalWebsiteDescription')} dense wide>
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
            <div className="grid gap-4 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-blue-100 transition hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('settings.title')}
                </Link>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <Globe className="h-5 w-5 text-blue-100" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Website CMS</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('settings.hospitalWebsite')}</h1>
                  </div>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-50">
                  Update homepage copy, appointment messaging, care team profiles, contact details, and footer content from one editor.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('settings.hospitalWebsiteViewLive')}
                </a>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? t('settings.saving') : t('settings.save')}
                </button>
              </div>
            </div>
          </section>

          {message && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                message.type === 'ok'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              <div className="flex gap-2.5">
                <Shield className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{t('settings.hospitalWebsiteHint')}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3">
                <label className="flex items-start justify-between gap-3 text-xs font-medium text-slate-800">
                  <span>
                    <span className="block font-semibold">Use settings contact</span>
                    <span className="mt-0.5 block font-normal text-slate-500">{t('settings.hospitalWebsiteUseContact')}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.useSettingsContact}
                    onChange={(e) => update({ useSettingsContact: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                  <span className="font-semibold text-slate-700">{t('settings.hospitalWebsiteEditor')}</span>
                  <button
                    type="button"
                    onClick={() => setShowJson(!showJson)}
                    className="rounded-md bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    {showJson ? t('settings.hospitalWebsiteFormMode') : t('settings.hospitalWebsiteJsonMode')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showJson ? (
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full min-h-[380px] font-mono text-xs p-3 border border-gray-200 rounded-lg text-gray-900 bg-white shadow-sm resize-y"
              spellCheck={false}
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <LayoutList className="h-3.5 w-3.5" />
                  {t('settings.hospitalWebsiteSectionNavHint')}
                </p>
                <div className="flex flex-wrap gap-1.5" role="tablist">
                  {navItems.map((item) => {
                    const selected = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold leading-tight transition-colors ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0 space-y-4">

                {activeSection === 'cms-hero' ? (
                <SectionCard id="cms-hero" title={t('settings.hospitalWebsiteSectionHero')}>
                  <Field label="Badge" value={form.heroBadge} onChange={(v) => update({ heroBadge: v })} />
                  <Field label="Title" value={form.heroTitle} onChange={(v) => update({ heroTitle: v })} />
                  <Field
                    label="Subtitle"
                    value={form.heroSubtitle}
                    onChange={(v) => update({ heroSubtitle: v })}
                    multiline
                  />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-600">
                      Key points (one per line)
                    </label>
                    <textarea
                      value={(form.heroBullets ?? []).join('\n')}
                      onChange={(e) =>
                        update({
                          heroBullets: e.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0),
                        })
                      }
                      rows={4}
                      className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Shown under the subtitle with checkmarks. Leave empty to hide."
                    />
                    <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">
                      Optional bullet list for the hero (e.g. scope of services, campus, access).
                    </p>
                  </div>
                  <Field
                    label="Hero image URL"
                    value={form.heroImageUrl}
                    onChange={(v) => update({ heroImageUrl: v })}
                    hint="Optional. HTTPS image URL for the hero panel."
                  />
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field
                      label="Primary CTA"
                      value={form.heroCtaPrimary}
                      onChange={(v) => update({ heroCtaPrimary: v })}
                    />
                    <Field
                      label="Secondary CTA"
                      value={form.heroCtaSecondary}
                      onChange={(v) => update({ heroCtaSecondary: v })}
                      hint="Outline button beside primary; scrolls to Services. Leave empty to hide."
                    />
                  </div>
                  <Field
                    label="Floating stat chip eyebrow"
                    value={form.heroStatChipEyebrow}
                    onChange={(v) => update({ heroStatChipEyebrow: v })}
                    hint="Small caps label on the stat badge over the hero image."
                  />
                  <Field
                    label="Fallback hero badge"
                    value={form.heroNoImageBadge}
                    onChange={(v) => update({ heroNoImageBadge: v })}
                    hint="Pulse badge above the organisation title when no hero image URL is set."
                  />
                  <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] leading-snug text-gray-600">
                    Public landing assistant (widget toggle, launcher label, welcome message) is configured under{' '}
                    <Link href="/settings/ai-chat" className="font-medium text-teal-700 hover:underline">
                      AI Chat Settings
                    </Link>
                    .
                  </p>
                </SectionCard>
                ) : null}

                {activeSection === 'cms-announcement' ? (
                <SectionCard
                  id="cms-announcement"
                  title={t('settings.hospitalWebsiteSectionAnnouncement')}
                  description="Leave empty to hide the banner below the site header."
                >
                  <Field
                    label="Announcement text"
                    value={form.announcementText}
                    onChange={(v) => update({ announcementText: v })}
                    multiline
                  />
                </SectionCard>
                ) : null}

                {activeSection === 'cms-trust-pillars' ? (
                <SectionCard
                  id="cms-trust-pillars"
                  title={t('settings.hospitalWebsiteSectionTrustPillars')}
                  description="Four pillar cards directly under the announcement bar."
                >
                  <Field
                    label="Band title"
                    value={form.trustPillarsTitle}
                    onChange={(v) => update({ trustPillarsTitle: v })}
                    hint="Centered heading above the pillar grid. Leave empty to hide."
                  />
                  {(form.trustPillars ?? []).map((pillar, i) => (
                    <div
                      key={i}
                      className="grid md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Field
                        label={`Pillar ${i + 1} title`}
                        value={pillar.title}
                        onChange={(x) => updateTrustPillar(i, 'title', x)}
                      />
                      <Field
                        label={`Pillar ${i + 1} subtitle`}
                        value={pillar.subtitle}
                        onChange={(x) => updateTrustPillar(i, 'subtitle', x)}
                        multiline
                      />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-highlights' ? (
                <SectionCard
                  id="cms-highlights"
                  title={t('settings.hospitalWebsiteSectionHighlights')}
                  description="Cards between the stats strip and About."
                >
                  <Field
                    label="Eyebrow"
                    value={form.highlightsEyebrow}
                    onChange={(v) => update({ highlightsEyebrow: v })}
                    hint="Small caps line above the section title."
                  />
                  <Field
                    label="Section title"
                    value={form.highlightsTitle}
                    onChange={(v) => update({ highlightsTitle: v })}
                  />
                  <Field
                    label="Section subtitle"
                    value={form.highlightsSubtitle}
                    onChange={(v) => update({ highlightsSubtitle: v })}
                    multiline
                  />
                  {form.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="grid md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Field
                        label={`Card ${i + 1} title`}
                        value={h.title}
                        onChange={(x) => updatePair('highlights', i, 'title', x)}
                      />
                      <Field
                        label={`Card ${i + 1} description`}
                        value={h.description}
                        onChange={(x) => updatePair('highlights', i, 'description', x)}
                        multiline
                      />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-about' ? (
                <SectionCard id="cms-about" title={t('settings.hospitalWebsiteSectionAbout')}>
                  <Field label="About title" value={form.aboutTitle} onChange={(v) => update({ aboutTitle: v })} />
                  <Field label="About body" value={form.aboutBody} onChange={(v) => update({ aboutBody: v })} multiline />
                  <Field label="Mission title" value={form.missionTitle} onChange={(v) => update({ missionTitle: v })} />
                  <Field
                    label="Mission body"
                    value={form.missionBody}
                    onChange={(v) => update({ missionBody: v })}
                    multiline
                  />
                  <Field
                    label="Values section title"
                    value={form.valuesTitle}
                    onChange={(v) => update({ valuesTitle: v })}
                  />
                  {form.values.map((v, i) => (
                    <div
                      key={i}
                      className="grid md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Field
                        label={`Value ${i + 1} title`}
                        value={v.title}
                        onChange={(x) => updatePair('values', i, 'title', x)}
                      />
                      <Field
                        label={`Value ${i + 1} description`}
                        value={v.description}
                        onChange={(x) => updatePair('values', i, 'description', x)}
                        multiline
                      />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-stats' ? (
                <SectionCard id="cms-stats" title={t('settings.hospitalWebsiteSectionStats')}>
                  <Field
                    label="Eyebrow above stats"
                    value={form.statsEyebrow}
                    onChange={(v) => update({ statsEyebrow: v })}
                    hint="Leave empty to hide the line above the dark stats strip."
                  />
                  {form.stats.map((s, i) => (
                    <div key={i} className="grid md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <Field label={`Stat ${i + 1} label`} value={s.label} onChange={(x) => updateStat(i, 'label', x)} />
                      <Field label={`Stat ${i + 1} value`} value={s.value} onChange={(x) => updateStat(i, 'value', x)} />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-services' ? (
                <SectionCard id="cms-services" title={t('settings.hospitalWebsiteSectionServices')}>
                  <Field
                    label="Eyebrow"
                    value={form.servicesEyebrow}
                    onChange={(v) => update({ servicesEyebrow: v })}
                  />
                  <Field
                    label="Section title"
                    value={form.servicesTitle}
                    onChange={(v) => update({ servicesTitle: v })}
                  />
                  <Field
                    label="Section subtitle"
                    value={form.servicesSubtitle}
                    onChange={(v) => update({ servicesSubtitle: v })}
                    multiline
                  />
                  {form.services.map((s, i) => (
                    <div
                      key={i}
                      className="grid md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Field
                        label={`Service ${i + 1} title`}
                        value={s.title}
                        onChange={(x) => updatePair('services', i, 'title', x)}
                      />
                      <Field
                        label={`Service ${i + 1} description`}
                        value={s.description}
                        onChange={(x) => updatePair('services', i, 'description', x)}
                        multiline
                      />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-subscriptions' ? (
                <SectionCard
                  id="cms-subscriptions"
                  title="Subscriptions"
                  description="Three public plan cards. Payment is intentionally a placeholder for now."
                >
                  <Field
                    label="Eyebrow"
                    value={form.subscriptionsEyebrow}
                    onChange={(v) => update({ subscriptionsEyebrow: v })}
                  />
                  <Field
                    label="Section title"
                    value={form.subscriptionsTitle}
                    onChange={(v) => update({ subscriptionsTitle: v })}
                  />
                  <Field
                    label="Section subtitle"
                    value={form.subscriptionsSubtitle}
                    onChange={(v) => update({ subscriptionsSubtitle: v })}
                    multiline
                  />
                  {(form.subscriptions ?? []).slice(0, 3).map((plan, i) => (
                    <div key={i} className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <Field label={`Plan ${i + 1} name`} value={plan.name} onChange={(v) => updateSubscription(i, 'name', v)} />
                        <Field label="Price" value={plan.price} onChange={(v) => updateSubscription(i, 'price', v)} />
                        <Field label="Cadence" value={plan.cadence} onChange={(v) => updateSubscription(i, 'cadence', v)} />
                      </div>
                      <Field
                        label="Description"
                        value={plan.description}
                        onChange={(v) => updateSubscription(i, 'description', v)}
                        multiline
                      />
                      <Field
                        label="Benefits (one per line)"
                        value={(plan.benefits || []).join('\n')}
                        onChange={(v) =>
                          updateSubscription(
                            i,
                            'benefits',
                            v.split('\n').map((line) => line.trim()).filter(Boolean)
                          )
                        }
                        multiline
                      />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-departments' ? (
                <SectionCard id="cms-departments" title={t('settings.hospitalWebsiteSectionDepartments')}>
                  <Field
                    label="Eyebrow"
                    value={form.departmentsEyebrow}
                    onChange={(v) => update({ departmentsEyebrow: v })}
                  />
                  <Field
                    label="Section title"
                    value={form.departmentsTitle}
                    onChange={(v) => update({ departmentsTitle: v })}
                  />
                  <Field
                    label="Section subtitle"
                    value={form.departmentsSubtitle}
                    onChange={(v) => update({ departmentsSubtitle: v })}
                    multiline
                  />
                  {form.departments.map((s, i) => (
                    <div
                      key={i}
                      className="grid md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Field
                        label={`Department ${i + 1} title`}
                        value={s.title}
                        onChange={(x) => updatePair('departments', i, 'title', x)}
                      />
                      <Field
                        label={`Department ${i + 1} description`}
                        value={s.description}
                        onChange={(x) => updatePair('departments', i, 'description', x)}
                        multiline
                      />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-providers' ? (
                <SectionCard
                  id="cms-providers"
                  title="Featured providers"
                  description="Shown on the public homepage with photo, role, and short bio."
                >
                  <Field
                    label="Eyebrow"
                    value={form.providersEyebrow}
                    onChange={(v) => update({ providersEyebrow: v })}
                  />
                  <Field
                    label="Section title"
                    value={form.providersTitle}
                    onChange={(v) => update({ providersTitle: v })}
                  />
                  <Field
                    label="Section subtitle"
                    value={form.providersSubtitle}
                    onChange={(v) => update({ providersSubtitle: v })}
                    multiline
                  />
                  {(form.providers ?? []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 p-6 text-center">
                      <Users className="mx-auto h-10 w-10 text-blue-400" />
                      <h4 className="mt-3 text-base font-semibold text-blue-950">No providers added yet</h4>
                      <p className="mx-auto mt-1 max-w-xl text-sm text-blue-800">
                        Add a provider row to enter the person&apos;s name, role, bio, and photo for the homepage Care team section.
                      </p>
                      <button
                        type="button"
                        onClick={addProvider}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add provider
                      </button>
                    </div>
                  ) : null}
                  {(form.providers ?? []).map((provider, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Provider {i + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeProvider(i)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
                        <div className="space-y-3">
                          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {provider.imageUrl?.trim() ? (
                              <img
                                src={provider.imageUrl.trim()}
                                alt={provider.name || `Provider ${i + 1}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                                <ImageIcon className="h-8 w-8" />
                                <span className="text-xs font-medium">No photo</span>
                              </div>
                            )}
                          </div>
                          <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                            <Upload className="h-4 w-4" />
                            Upload image
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/gif,image/webp"
                              className="sr-only"
                              onChange={(e) => {
                                handleProviderImageFile(i, e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {provider.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => updateProvider(i, 'imageUrl', '')}
                              className="w-full text-center text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              Remove photo
                            </button>
                          ) : null}
                        </div>
                        <div className="space-y-4">
                          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                            <h4 className="text-sm font-semibold text-blue-950">Provider details</h4>
                            <p className="mt-0.5 text-xs text-blue-800">
                              Add the provider name, role, and bio shown in the Care team section.
                            </p>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field
                              label="Provider name"
                              value={provider.name}
                              onChange={(x) => updateProvider(i, 'name', x)}
                            />
                            <Field
                              label="Role or specialty"
                              value={provider.role}
                              onChange={(x) => updateProvider(i, 'role', x)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              Photo URL or uploaded image
                            </label>
                            <input
                              type="text"
                              value={
                                provider.imageUrl?.startsWith('data:image/')
                                  ? 'Uploaded image stored with this provider'
                                  : provider.imageUrl
                              }
                              onChange={(e) => updateProvider(i, 'imageUrl', e.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                              placeholder="https://example.com/provider.jpg"
                              readOnly={provider.imageUrl?.startsWith('data:image/')}
                            />
                            <p className="mt-1 text-[11px] leading-snug text-slate-500">
                              Paste an HTTPS image URL, or upload PNG/JPG/GIF/WebP under 900 KB.
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              Provider bio
                            </label>
                            <textarea
                              value={provider.bio}
                              onChange={(e) => updateProvider(i, 'bio', e.target.value)}
                              rows={5}
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                              placeholder="Short bio, qualifications, specialty focus, or patient care approach."
                            />
                            <p className="mt-1 text-[11px] leading-snug text-slate-500">
                              This appears under the provider name on the homepage.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addProvider}
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="h-4 w-4" />
                    Add provider
                  </button>
                </SectionCard>
                ) : null}

                {activeSection === 'cms-care-journey' ? (
                <SectionCard
                  id="cms-care-journey"
                  title={t('settings.hospitalWebsiteSectionCareJourney')}
                  description="Patient pathway steps with icons assigned by row order on the site."
                >
                  <Field
                    label="Eyebrow"
                    value={form.careJourneyEyebrow}
                    onChange={(v) => update({ careJourneyEyebrow: v })}
                  />
                  <Field label="Section title" value={form.careJourneyTitle} onChange={(v) => update({ careJourneyTitle: v })} />
                  <Field
                    label="Section subtitle"
                    value={form.careJourneySubtitle}
                    onChange={(v) => update({ careJourneySubtitle: v })}
                    multiline
                  />
                  {(form.careJourneySteps ?? []).map((step, i) => (
                    <div key={i} className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <Field label={`Step ${i + 1} title`} value={step.title} onChange={(x) => updateCareStep(i, 'title', x)} />
                      <Field label={`Step ${i + 1} body`} value={step.body} onChange={(x) => updateCareStep(i, 'body', x)} multiline />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-visit' ? (
                <SectionCard
                  id="cms-visit"
                  title={t('settings.hospitalWebsiteSectionVisit')}
                  description="Reception hours, ED, parking — label + value rows."
                >
                  <Field
                    label="Eyebrow"
                    value={form.visitEyebrow}
                    onChange={(v) => update({ visitEyebrow: v })}
                  />
                  <Field label="Section title" value={form.visitTitle} onChange={(v) => update({ visitTitle: v })} />
                  <Field
                    label="Section subtitle"
                    value={form.visitSubtitle}
                    onChange={(v) => update({ visitSubtitle: v })}
                    multiline
                  />
                  {form.visitRows.map((row, i) => (
                    <div
                      key={i}
                      className="grid md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Field
                        label={`Row ${i + 1} label`}
                        value={row.label}
                        onChange={(x) => updateVisitRow(i, 'label', x)}
                      />
                      <Field
                        label={`Row ${i + 1} value`}
                        value={row.value}
                        onChange={(x) => updateVisitRow(i, 'value', x)}
                        multiline
                      />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-testimonials' ? (
                <SectionCard id="cms-testimonials" title={t('settings.hospitalWebsiteSectionTestimonials')}>
                  <Field
                    label="Eyebrow"
                    value={form.testimonialsEyebrow}
                    onChange={(v) => update({ testimonialsEyebrow: v })}
                  />
                  <Field
                    label="Section title"
                    value={form.testimonialsTitle}
                    onChange={(v) => update({ testimonialsTitle: v })}
                  />
                  {form.testimonials.map((story, i) => (
                    <div
                      key={i}
                      className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Field
                        label={`Quote ${i + 1}`}
                        value={story.quote}
                        onChange={(x) => updateTestimonial(i, 'quote', x)}
                        multiline
                      />
                      <div className="grid md:grid-cols-2 gap-3">
                        <Field
                          label="Author or initials"
                          value={story.author}
                          onChange={(x) => updateTestimonial(i, 'author', x)}
                        />
                        <Field
                          label="Context (e.g. department)"
                          value={story.role}
                          onChange={(x) => updateTestimonial(i, 'role', x)}
                        />
                      </div>
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-faq' ? (
                <SectionCard id="cms-faq" title={t('settings.hospitalWebsiteSectionFaq')}>
                  <Field label="Eyebrow" value={form.faqEyebrow} onChange={(v) => update({ faqEyebrow: v })} />
                  <Field label="Section title" value={form.faqTitle} onChange={(v) => update({ faqTitle: v })} />
                  <Field
                    label="Section subtitle"
                    value={form.faqSubtitle}
                    onChange={(v) => update({ faqSubtitle: v })}
                    multiline
                  />
                  {form.faqItems.map((item, i) => (
                    <div
                      key={i}
                      className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <Field
                        label={`Question ${i + 1}`}
                        value={item.question}
                        onChange={(x) => updateFaq(i, 'question', x)}
                      />
                      <Field
                        label="Answer"
                        value={item.answer}
                        onChange={(x) => updateFaq(i, 'answer', x)}
                        multiline
                      />
                    </div>
                  ))}
                </SectionCard>
                ) : null}

                {activeSection === 'cms-appointment' ? (
                <SectionCard
                  id="cms-appointment"
                  title={t('settings.hospitalWebsiteSectionAppointment')}
                  description="Public form at /request-appointment creates a scheduled appointment for staff to confirm."
                >
                  <label className="flex items-center gap-2 text-xs text-gray-800">
                    <input
                      type="checkbox"
                      checked={form.appointmentRequestEnabled}
                      onChange={(e) => update({ appointmentRequestEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    Enable appointment requests on the public site
                  </label>
                  <Field
                    label="Homepage section eyebrow"
                    value={form.appointmentSectionEyebrow}
                    onChange={(v) => update({ appointmentSectionEyebrow: v })}
                    hint="Small caps line above the appointment strip title."
                  />
                  <Field
                    label="Nav & section label (short)"
                    value={form.appointmentNavLabel}
                    onChange={(v) => update({ appointmentNavLabel: v })}
                  />
                  <Field
                    label="Homepage section title"
                    value={form.appointmentSectionTitle}
                    onChange={(v) => update({ appointmentSectionTitle: v })}
                  />
                  <Field
                    label="Homepage section subtitle"
                    value={form.appointmentSectionSubtitle}
                    onChange={(v) => update({ appointmentSectionSubtitle: v })}
                    multiline
                  />
                  <Field
                    label="Homepage & hero button label"
                    value={form.appointmentSectionButtonLabel}
                    onChange={(v) => update({ appointmentSectionButtonLabel: v })}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-800">
                    <input
                      type="checkbox"
                      checked={form.heroPrimaryLinksAppointment}
                      onChange={(e) => update({ heroPrimaryLinksAppointment: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    Hero primary button goes to appointment form (instead of scrolling to contact)
                  </label>
                  <Field
                    label="Request page title"
                    value={form.requestAppointmentPageTitle}
                    onChange={(v) => update({ requestAppointmentPageTitle: v })}
                  />
                  <Field
                    label="Request page subtitle"
                    value={form.requestAppointmentPageSubtitle}
                    onChange={(v) => update({ requestAppointmentPageSubtitle: v })}
                    multiline
                  />
                  <Field
                    label="Success message after submit"
                    value={form.requestAppointmentSuccessMessage}
                    onChange={(v) => update({ requestAppointmentSuccessMessage: v })}
                    multiline
                  />
                  <Field
                    label="Placeholder doctor name (stored on new rows until staff assigns a provider)"
                    value={form.appointmentPlaceholderDoctorName}
                    onChange={(v) => update({ appointmentPlaceholderDoctorName: v })}
                    hint="Shown in the appointments list as the doctor field until updated."
                  />
                </SectionCard>
                ) : null}

                {activeSection === 'cms-contact' ? (
                <SectionCard
                  id="cms-contact"
                  title={t('settings.hospitalWebsiteSectionContact')}
                  description="Contact copy and optional map embed next to organisation contact details."
                >
                  <Field label="Eyebrow" value={form.contactEyebrow} onChange={(v) => update({ contactEyebrow: v })} />
                  <Field
                    label="Contact title"
                    value={form.contactTitle}
                    onChange={(v) => update({ contactTitle: v })}
                  />
                  <Field
                    label="Contact body"
                    value={form.contactBody}
                    onChange={(v) => update({ contactBody: v })}
                    multiline
                  />
                  <Field
                    label="Map embed URL"
                    value={form.mapEmbedUrl}
                    onChange={(v) => update({ mapEmbedUrl: v })}
                    hint="Google Maps “Embed” iframe src — must start with https://"
                  />
                  <Field label="Emergency CTA title" value={form.ctaTitle} onChange={(v) => update({ ctaTitle: v })} />
                  <Field
                    label="Emergency CTA subtitle"
                    value={form.ctaSubtitle}
                    onChange={(v) => update({ ctaSubtitle: v })}
                    multiline
                  />
                </SectionCard>
                ) : null}

                {activeSection === 'cms-footer' ? (
                <SectionCard id="cms-footer" title={t('settings.hospitalWebsiteSectionFooter')}>
                  <Field
                    label="Footer tagline"
                    value={form.footerTagline}
                    onChange={(v) => update({ footerTagline: v })}
                    multiline
                  />
                  <p className="text-[11px] text-gray-500 leading-snug">{t('settings.hospitalWebsiteFooterColumns')}</p>
                  {form.footerColumns.map((col, i) => (
                    <div key={i} className="p-3 border border-gray-200 rounded-lg space-y-2 bg-gray-50/50">
                      <Field
                        label={`Column ${i + 1} title`}
                        value={col.title}
                        onChange={(v) => {
                          const fc = [...form.footerColumns];
                          fc[i] = { ...fc[i], title: v };
                          update({ footerColumns: fc });
                        }}
                      />
                      <Field
                        label={`Column ${i + 1} lines (one per line)`}
                        value={(col.lines || []).join('\n')}
                        onChange={(v) => {
                          const fc = [...form.footerColumns];
                          fc[i] = {
                            ...fc[i],
                            lines: v
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean),
                          };
                          update({ footerColumns: fc });
                        }}
                        multiline
                      />
                    </div>
                  ))}
                  <Field label="Meta title" value={form.metaTitle} onChange={(v) => update({ metaTitle: v })} />
                  <Field
                    label="Meta description"
                    value={form.metaDescription}
                    onChange={(v) => update({ metaDescription: v })}
                    multiline
                  />
                </SectionCard>
                ) : null}
              </div>
            </div>
          )}

          <div className="sticky bottom-0 z-10 flex justify-end border-t border-slate-200 bg-white/90 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
