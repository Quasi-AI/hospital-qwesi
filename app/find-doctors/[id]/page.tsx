import type { Metadata } from 'next';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import { getLandingSettings } from '@/lib/getLandingSettings';
import { PublicHeader, PublicFooter } from '@/app/components/public-shell';
import { DoctorProfile } from '@/app/components/doctor-profile';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Doctor profile | Book & pay online' };

export default async function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, content, settings] = await Promise.all([params, getMergedWebsiteContent(), getLandingSettings()]);
  return (
    <div className="qw-soft-bg min-h-screen">
      <PublicHeader settings={settings} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-20">
        <DoctorProfile id={id} />
      </main>
      <PublicFooter settings={settings} content={content} />
    </div>
  );
}
