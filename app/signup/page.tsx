'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileText, Heart, Lock, Pill, ShieldCheck, Stethoscope, User, UserCheck } from 'lucide-react';

type SignupRole = 'patient' | 'doctor' | 'nurse' | 'pharmacy';

export default function SignupApprovalPage() {
  const [role, setRole] = useState<SignupRole>('patient');
  const [form, setForm] = useState({
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
    address: '',
    agreementTerms: false,
    agreementPrivacy: false,
    agreementHealth: false,
    agreementTelemedicine: false,
    signedName: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const update = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/signup/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          role,
          agreement: {
            termsAccepted: form.agreementTerms,
            privacyAccepted: form.agreementPrivacy,
            healthConsentAccepted: form.agreementHealth,
            telemedicineConsentAccepted: form.agreementTelemedicine,
            signedName: form.signedName,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Signup failed');
      setMessage(data.message || 'Signup submitted for approval.');
      setForm({
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
        address: '',
        agreementTerms: false,
        agreementPrivacy: false,
        agreementHealth: false,
        agreementTelemedicine: false,
        signedName: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-950">Sign Up for Approval</h1>
          <p className="mt-1 text-sm text-gray-600">Patients, doctors, nurses, and pharmacies can request access here. Admin approval controls activation.</p>
        </div>

        <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['patient', 'Patient', Heart],
              ['doctor', 'Doctor', Stethoscope],
              ['nurse', 'Nurse', UserCheck],
              ['pharmacy', 'Pharmacy', Pill],
            ].map(([value, label, Icon]) => (
              <button
                key={value as string}
                type="button"
                onClick={() => setRole(value as SignupRole)}
                className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold ${
                  role === value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label as string}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full name" value={form.name} onChange={(value) => update('name', value)} icon={User} required />
            <Field label="Email" value={form.email} onChange={(value) => update('email', value)} type="email" required />
            <Field label="Password" value={form.password} onChange={(value) => update('password', value)} type="password" icon={Lock} required />
            <Field label="Phone" value={form.phone} onChange={(value) => update('phone', value)} required={role === 'patient'} />

            {role === 'patient' ? (
              <>
                <Field label="Date of birth" value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} type="date" required />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Gender</span>
                  <select value={form.gender} onChange={(event) => update('gender', event.target.value)} required className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </label>
                <div className="md:col-span-2">
                  <Field label="Address" value={form.address} onChange={(value) => update('address', value)} />
                </div>
              </>
            ) : (
              <>
                <Field label="Department" value={form.department} onChange={(value) => update('department', value)} placeholder={role === 'nurse' ? 'Nursing' : role === 'pharmacy' ? 'Pharmacy' : 'Clinical'} />
                <Field label="Specialization" value={form.specialization} onChange={(value) => update('specialization', value)} placeholder={role === 'pharmacy' ? 'Community pharmacy' : 'Specialization'} />
                <Field label="License number" value={form.licenseNumber} onChange={(value) => update('licenseNumber', value)} />
                <Field label="Years of experience" value={form.yearsOfExperience} onChange={(value) => update('yearsOfExperience', value)} type="number" />
              </>
            )}
          </div>

          <section className="mt-5 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-3 flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <h2 className="text-sm font-semibold text-blue-950">Patient and provider agreement</h2>
                <p className="mt-1 text-xs leading-relaxed text-blue-900">
                  Review these healthcare privacy and service terms before submitting your request. Your typed name below is stored as your electronic signature.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <AgreementBlock
                title="Data privacy"
                items={[
                  'Qwesi may collect identity, contact, clinical, appointment, prescription, billing, and support information needed to provide care.',
                  'Health records are handled as confidential medical information and are shared only with authorized care team members, pharmacies, labs, payment processors, and regulators where required.',
                  'You are responsible for keeping your login details private and reporting unauthorized access quickly.',
                ]}
              />
              <AgreementBlock
                title="Terms and conditions"
                items={[
                  'The platform supports healthcare coordination but does not replace emergency services or in-person clinical judgment.',
                  'You agree to provide accurate information and understand that false or incomplete information can affect care decisions.',
                  'Access can be paused or rejected if profile, license, identity, or safety requirements are not met.',
                ]}
              />
              <AgreementBlock
                title="Healthcare consent"
                items={[
                  'You consent to care coordination, clinical documentation, appointment management, medication support, home-care requests, and follow-up communication through the platform.',
                  'For urgent symptoms such as chest pain, severe bleeding, trouble breathing, stroke signs, seizures, or loss of consciousness, seek emergency care immediately.',
                  'Providers must use the platform according to professional standards, licensing requirements, and patient confidentiality obligations.',
                ]}
              />
              <AgreementBlock
                title="Telemedicine and pharmacy"
                items={[
                  'Virtual care can have limits, including network issues, incomplete examinations, or the need for referral to an in-person facility.',
                  'Prescriptions and medicine dispensing may require pharmacist review, identity checks, stock availability, and local regulatory compliance.',
                  'Messages, video visits, and pharmacy workflows may be stored as part of the health record for continuity of care.',
                ]}
              />
            </div>

            <div className="mt-4 space-y-2">
              <AgreementCheck
                checked={form.agreementPrivacy}
                onChange={(checked) => setForm((current) => ({ ...current, agreementPrivacy: checked }))}
                label="I accept the data privacy notice and consent to confidential processing of my healthcare information."
              />
              <AgreementCheck
                checked={form.agreementTerms}
                onChange={(checked) => setForm((current) => ({ ...current, agreementTerms: checked }))}
                label="I accept the platform terms and conditions."
              />
              <AgreementCheck
                checked={form.agreementHealth}
                onChange={(checked) => setForm((current) => ({ ...current, agreementHealth: checked }))}
                label="I understand the healthcare consent information, emergency warning signs, and my responsibility to provide accurate information."
              />
              <AgreementCheck
                checked={form.agreementTelemedicine}
                onChange={(checked) => setForm((current) => ({ ...current, agreementTelemedicine: checked }))}
                label="I accept the telemedicine, pharmacy, and care coordination consent."
              />
            </div>

            <label className="mt-4 block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4 text-blue-700" />
                Electronic signature
              </span>
              <input
                value={form.signedName}
                onChange={(event) => update('signedName', event.target.value)}
                required
                placeholder="Type your full legal name"
                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-600">
                By typing your name, you sign this agreement electronically for your {role === 'pharmacy' ? 'pharmacy' : role} account request.
              </p>
            </label>
          </section>

          {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {message && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/login" className="text-sm font-medium text-blue-700 hover:text-blue-900">Back to login</Link>
            <button
              disabled={
                loading ||
                !form.agreementTerms ||
                !form.agreementPrivacy ||
                !form.agreementHealth ||
                !form.agreementTelemedicine ||
                !form.signedName.trim()
              }
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AgreementBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-blue-100 bg-white p-3">
      <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-gray-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgreementCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required
        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span>{label}</span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  icon?: React.ElementType;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder || label}
          className={`h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${Icon ? 'pl-9' : ''}`}
        />
      </div>
    </label>
  );
}
