'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogoLink } from './logo';
import { CURRENCIES, CURRENCY_LABELS } from '@/lib/practitioner-currency';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Heart,
  Leaf,
  Lock,
  Mail,
  Phone,
  Pill,
  Stethoscope,
  User,
} from 'lucide-react';

export type SignupRole = 'patient' | 'doctor' | 'herbalist' | 'pharmacy';

const copy: Record<
  SignupRole,
  { title: string; subtitle: string; icon: React.ElementType; submit: string; points: string[]; other: { href: string; label: string }[] }
> = {
  patient: {
    title: 'Create your patient account',
    subtitle: 'Find a doctor, see their fee, and pay to book — your account is active immediately.',
    icon: Heart,
    submit: 'Create account',
    points: ['Browse verified doctors and their fees', 'Pay securely to confirm a booking', 'Prescriptions and reports in one place'],
    other: [
      { href: '/signup/doctor', label: 'I’m a doctor' },
      { href: '/signup/herbalist', label: 'I’m a herbalist' },
      { href: '/signup/pharmacy', label: 'I’m a pharmacy' },
    ],
  },
  doctor: {
    title: 'Join as a doctor',
    subtitle: 'Set your own consultation fee and get booked by patients. Your licence is reviewed before your profile goes live.',
    icon: Stethoscope,
    submit: 'Submit for approval',
    points: ['You decide your consultation fee', 'Patients pay up front to book you', 'Video, audio or chat from anywhere'],
    other: [
      { href: '/signup/patient', label: 'I’m a patient' },
      { href: '/signup/herbalist', label: 'I’m a herbalist' },
      { href: '/signup/pharmacy', label: 'I’m a pharmacy' },
    ],
  },
  herbalist: {
    title: 'Join as a herbalist',
    subtitle: 'Offer herbal consultations, set your own fee and get booked by patients. Your credentials are reviewed before your profile goes live.',
    icon: Leaf,
    submit: 'Submit for approval',
    points: ['You decide your consultation fee', 'Patients pay up front to book you', 'Consult by video, audio or chat'],
    other: [
      { href: '/signup/patient', label: 'I’m a patient' },
      { href: '/signup/doctor', label: 'I’m a doctor' },
      { href: '/signup/pharmacy', label: 'I’m a pharmacy' },
    ],
  },
  pharmacy: {
    title: 'Register your pharmacy',
    subtitle: 'Receive e-prescriptions and dispense to patients. Your licence is reviewed before your account is activated.',
    icon: Pill,
    submit: 'Submit for approval',
    points: ['Receive prescriptions digitally', 'Manage your medicine stock', 'Reach patients around the world'],
    other: [
      { href: '/signup/patient', label: 'I’m a patient' },
      { href: '/signup/doctor', label: 'I’m a doctor' },
      { href: '/signup/herbalist', label: 'I’m a herbalist' },
    ],
  },
};

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  department: '',
  specialization: '',
  licenseNumber: '',
  yearsOfExperience: '',
  consultationFee: '',
  currency: 'USD',
  address: '',
  accepted: false,
  signedName: '',
};

export default function SignupForm({ role }: { role: SignupRole }) {
  const searchParams = useSearchParams();
  const c = copy[role];
  const Icon = c.icon;
  const [form, setForm] = useState({ ...emptyForm, phone: searchParams.get('phone') || '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const nextParam = searchParams.get('next') || '';
  const loginHref = nextParam.startsWith('/patient-portal') ? `/login?next=${encodeURIComponent(nextParam)}` : '/login';
  const update = (field: string, value: string) => setForm((cur) => ({ ...cur, [field]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email address (e.g. name@example.com).');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/signup/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          role,
          agreement: {
            termsAccepted: form.accepted,
            privacyAccepted: form.accepted,
            healthConsentAccepted: form.accepted,
            telemedicineConsentAccepted: form.accepted,
            signedName: form.signedName,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Signup failed');
      setMessage(data.message || 'Signup submitted.');
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 min-h-screen lg:grid-cols-[0.8fr_1.2fr]">
      {/* Brand panel */}
      <aside className="qw-hero-bg relative hidden flex-col justify-between overflow-hidden text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="relative z-10 border-b border-brand-100 !bg-white px-10 py-4">
          <LogoLink className="h-8" priority />
        </div>
        <div className="hero-in px-10">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon className="h-7 w-7" />
          </span>
          <h2 className="font-display mt-6 text-4xl font-semibold leading-tight">{c.title}</h2>
          <p className="mt-3 max-w-md text-white/75">{c.subtitle}</p>
          <ul className="mt-8 space-y-3">
            {c.points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-white/90">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-300" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="px-10 pb-8 text-xs text-white/50">Virtual care is not for emergencies.</p>
      </aside>

      {/* Form */}
      <main className="flex items-stretch justify-center sm:items-start sm:px-8 sm:py-8 lg:items-center lg:py-6">
        <div className="glass-strong w-full max-w-xl lg:max-w-2xl !rounded-none !border-0 px-5 pb-10 pt-6 !shadow-none sm:!rounded-3xl sm:!border sm:p-8 lg:p-6 sm:!shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3 lg:mb-3">
            <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900">
              <ArrowLeft className="h-4 w-4" /> All account types
            </Link>
            <span className="lg:hidden"><LogoLink className="h-7" priority /></span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-brand-950 sm:text-3xl lg:hidden">{c.title}</h1>
          <p className="mt-1 text-sm text-gray-600 lg:hidden">{c.subtitle}</p>
          <h1 className="font-display hidden text-2xl font-semibold text-brand-950 lg:block">{c.title}</h1>

          <form onSubmit={submit} className="mt-5 space-y-3 lg:mt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Field wrap="lg:col-span-3" label="Full name" value={form.name} onChange={(v) => update('name', v)} icon={User} required />
              <Field wrap="lg:col-span-3" label="Email" value={form.email} onChange={(v) => update('email', v)} type="email" icon={Mail} required />
              <Field wrap="lg:col-span-3" label="Phone" value={form.phone} onChange={(v) => update('phone', v)} icon={Phone} required={role === 'patient'} />
              <Field wrap="lg:col-span-3" label="Password" value={form.password} onChange={(v) => update('password', v)} type="password" icon={Lock} required />

              {role === 'patient' && (
                <>
                  <Field wrap="lg:col-span-2" label="Date of birth" value={form.dateOfBirth} onChange={(v) => update('dateOfBirth', v)} type="date" required />
                  <label className="block lg:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Gender</span>
                    <select value={form.gender} onChange={(e) => update('gender', e.target.value)} required className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200">
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </label>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <Field label="Address (optional)" value={form.address} onChange={(v) => update('address', v)} />
                  </div>
                </>
              )}

              {(role === 'doctor' || role === 'herbalist') && (
                <>
                  <Field wrap="lg:col-span-3" label="Specialization" value={form.specialization} onChange={(v) => update('specialization', v)} placeholder={role === 'herbalist' ? 'e.g. Herbal medicine' : 'e.g. Cardiology'} required />
                  <Field wrap="lg:col-span-3" label={role === 'herbalist' ? 'Registration / licence no.' : 'Licence number'} value={form.licenseNumber} onChange={(v) => update('licenseNumber', v)} required />
                  <Field wrap="lg:col-span-2" label="Years of experience" value={form.yearsOfExperience} onChange={(v) => update('yearsOfExperience', v)} type="number" />
                  <label className="block lg:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Currency</span>
                    <select value={form.currency} onChange={(e) => update('currency', e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200">
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c} title={CURRENCY_LABELS[c]}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <Field label="Fee patients pay" value={form.consultationFee} onChange={(v) => update('consultationFee', v)} type="number" placeholder="e.g. 150" required />
                  </div>
                </>
              )}

              {role === 'pharmacy' && (
                <>
                  <Field wrap="lg:col-span-3" label="Pharmacy / pharmacist name" value={form.department} onChange={(v) => update('department', v)} placeholder="Pharmacy name" />
                  <Field wrap="lg:col-span-3" label="Licence number" value={form.licenseNumber} onChange={(v) => update('licenseNumber', v)} required />
                  <Field wrap="lg:col-span-3" label="Years of experience" value={form.yearsOfExperience} onChange={(v) => update('yearsOfExperience', v)} type="number" />
                  <Field wrap="lg:col-span-3" label="Address" value={form.address} onChange={(v) => update('address', v)} />
                </>
              )}
            </div>

            {/* Compact agreement */}
            <section className="grid grid-cols-1 gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-3 sm:p-4 lg:grid-cols-2 lg:items-start">
              <div>
              <label className="flex items-start gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={form.accepted}
                  onChange={(e) => setForm((cur) => ({ ...cur, accepted: e.target.checked }))}
                  required
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  I accept the terms and conditions, data privacy notice, and telemedicine &amp; healthcare consent.
                </span>
              </label>
              <div className="mt-2">
                <div className="mb-1 text-xs font-semibold text-brand-700">Agreement (scroll to read)</div>
                <div tabIndex={0} role="region" aria-label="Agreement text" className="max-h-44 overflow-y-auto overscroll-contain rounded-xl border border-brand-100 bg-white/80 p-3 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:max-h-56">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>Qwesi collects identity, contact, clinical, appointment, prescription and billing information to provide care. It is handled as confidential medical information and shared only with authorised parties and regulators where required.</li>
                    <li>The platform supports virtual care and does not replace emergency services. For chest pain, severe bleeding, trouble breathing, stroke signs, seizures or loss of consciousness, seek emergency care immediately.</li>
                    <li>You agree to provide accurate information and to keep your login private. Access can be paused or rejected if licence, identity or safety requirements are not met.</li>
                    <li>Virtual care has limits, such as network issues or the need for an in-person referral. Prescriptions and dispensing may require pharmacist review and local regulatory compliance.</li>
                  </ul>
                </div>
              </div>
              </div>
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="h-4 w-4 text-brand-700" /> Electronic signature
                </span>
                <input
                  value={form.signedName}
                  onChange={(e) => update('signedName', e.target.value)}
                  required
                  placeholder="Type your full legal name"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
            </section>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {message && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {message}
              </div>
            )}

            <button
              disabled={loading || !form.accepted || !form.signedName.trim()}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-600 px-7 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? 'Submitting…' : c.submit}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href={loginHref} className="font-semibold text-brand-700 hover:text-brand-900">
                {message ? 'Continue to log in →' : 'Log in'}
              </Link>
            </p>
            <p className="text-center text-xs text-gray-500">
              {c.other.map((o, i) => (
                <span key={o.href}>
                  {i > 0 && ' · '}
                  <Link href={o.href} className="font-medium text-brand-700 hover:underline">{o.label}</Link>
                </span>
              ))}
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', required, placeholder, icon: Icon, wrap = '',
}: {
  wrap?: string;
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; icon?: React.ElementType;
}) {
  return (
    <label className={`block ${wrap}`}>
      <span className="mb-1 block truncate text-sm font-medium text-gray-700">{label}</span>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder || label}
          className={`h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 ${Icon ? 'pl-9' : ''}`}
        />
      </div>
    </label>
  );
}
