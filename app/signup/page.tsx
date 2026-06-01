'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Heart, Lock, Pill, Stethoscope, User, UserCheck } from 'lucide-react';

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
        body: JSON.stringify({ ...form, role }),
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

          {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {message && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/login" className="text-sm font-medium text-blue-700 hover:text-blue-900">Back to login</Link>
            <button disabled={loading} className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
