import type { Metadata } from 'next';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import { getLandingSettings } from '@/lib/getLandingSettings';
import { listPublicDoctors } from '@/lib/public-doctors';
import { HospitalLanding } from '@/app/components/hospital-landing';

/** Always load CMS copy at request time — build-time prerender often has no DB and would freeze defaults. */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const c = await getMergedWebsiteContent();
  return {
    title: c.metaTitle || c.heroTitle,
    description: c.metaDescription || c.heroSubtitle,
  };
}

export default async function HomePage() {
  const [content, settings, doctors] = await Promise.all([
    getMergedWebsiteContent(),
    getLandingSettings(),
    listPublicDoctors().catch(() => undefined), // fall back to client fetch if the DB hiccups
  ]);
  return <HospitalLanding content={content} settings={settings} initialDoctors={doctors} />;
}
