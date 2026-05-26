import type { Metadata } from 'next';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import { getLandingSettings } from '@/lib/getLandingSettings';
import { RequestAppointmentForm } from '@/app/components/request-appointment-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const c = await getMergedWebsiteContent();
  return {
    title: c.requestAppointmentPageTitle || 'Appointment request',
    description: (c.requestAppointmentPageSubtitle || c.metaDescription || '').slice(0, 160),
  };
}

export default async function RequestAppointmentPage() {
  const [content, settings] = await Promise.all([getMergedWebsiteContent(), getLandingSettings()]);
  return <RequestAppointmentForm content={content} settings={settings} />;
}
