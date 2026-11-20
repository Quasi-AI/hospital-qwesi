import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, Heart, Pill, Stethoscope } from 'lucide-react';

export const metadata: Metadata = { title: 'Create an account · Qwesi' };

const options = [
  {
    href: '/signup/patient',
    title: 'Patient',
    text: 'Find a doctor, see their fee and pay to book a consultation.',
    cta: 'Sign up as a patient',
    icon: Heart,
    note: 'Active immediately',
  },
  {
    href: '/signup/doctor',
    title: 'Doctor',
    text: 'Set your own consultation fee and get booked by patients.',
    cta: 'Join as a doctor',
    icon: Stethoscope,
    note: 'Licence reviewed first',
  },
  {
    href: '/signup/pharmacy',
    title: 'Pharmacy',
    text: 'Receive e-prescriptions and dispense medicine to patients.',
    cta: 'Register a pharmacy',
    icon: Pill,
    note: 'Licence reviewed first',
  },
];

export default async function SignupChooser({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (k: string) => (Array.isArray(params[k]) ? (params[k] as string[])[0] : (params[k] as string | undefined));

  // Old deep links (?role=doctor&phone=...) go straight to the right page.
  const role = pick('role');
  if (role === 'patient' || role === 'doctor' || role === 'pharmacy') {
    const qs = new URLSearchParams();
    for (const k of ['phone', 'next']) {
      const v = pick(k);
      if (v) qs.set(k, v);
    }
    redirect(`/signup/${role}${qs.toString() ? `?${qs}` : ''}`);
  }
  const next = pick('next');
  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="font-display mb-8 text-3xl font-semibold text-brand-950">Qwesi</Link>
      <div className="hero-in text-center">
        <h1 className="font-display text-3xl font-semibold text-brand-950 sm:text-4xl">Create your account</h1>
        <p className="mt-2 text-gray-600">Choose how you’ll use Qwesi.</p>
      </div>
      <div className="reveal-stagger mt-10 grid w-full max-w-4xl gap-5 md:grid-cols-3">
        {options.map(({ href, title, text, cta, icon: Icon, note }) => (
          <Link key={href} href={`${href}${href === '/signup/patient' ? suffix : ''}`} className="qw-card group flex flex-col p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <Icon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 flex-1 text-sm text-gray-600">{text}</p>
            <p className="mt-3 text-xs font-medium text-brand-700">{note}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 group-hover:gap-3">
              {cta} <ArrowRight className="h-4 w-4 transition-all" />
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-600">
        Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-900">Log in</Link>
      </p>
    </div>
  );
}
