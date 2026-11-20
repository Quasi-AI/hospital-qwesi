import type { Metadata } from 'next';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import { getLandingSettings } from '@/lib/getLandingSettings';
import { PublicHeader, PublicFooter, PublicChat } from '@/app/components/public-shell';
import { DoctorMarketplace } from '@/app/components/doctor-marketplace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Find a doctor | Compare fees & book online',
  description: 'Browse verified doctors, compare consultation fees, and pay to book your online appointment.',
};

export default async function FindDoctorsPage({ searchParams }: { searchParams: Promise<{ specialty?: string }> }) {
  const [content, settings, sp] = await Promise.all([getMergedWebsiteContent(), getLandingSettings(), searchParams]);
  return (
    <div className="qw-soft-bg min-h-screen">
      <PublicHeader settings={settings} />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">Doctors</p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-brand-950 sm:text-4xl">Find your doctor</h1>
          <p className="mt-3 text-gray-600">
            Every doctor sets their own consultation fee. Compare, pick a time, and pay to confirm your booking.
          </p>
        </div>
        <DoctorMarketplace initialSpecialty={sp.specialty || ''} />
      </main>
      <PublicFooter settings={settings} content={content} />
      <PublicChat content={content} settings={settings} />
    </div>
  );
}
