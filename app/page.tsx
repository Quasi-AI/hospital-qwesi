import type { Metadata } from 'next';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import { getLandingSettings } from '@/lib/getLandingSettings';
import { HospitalLanding } from '@/app/components/hospital-landing';

/** Always load CMS copy at request time — build-time prerender often has no DB and would freeze defaults. */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const c = await getMergedWebsiteContent();
  return {
    title: 'Qwesi Care | Find Doctors & Herbalists Online',
    description: 'Discover trusted doctors and herbalists, compare consultation fees, book appointments and connect through virtual consultations.',
  };
}

export default async function HomePage() {
  const [content, settings] = await Promise.all([getMergedWebsiteContent(), getLandingSettings()]);
  return <HospitalLanding content={content} settings={settings} />;
}
