import { NextRequest, NextResponse } from 'next/server';
import { runLifecycleJobs } from '@/lib/lifecycle';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Call daily from a scheduler (Vercel Cron, cron-job.org, GitHub Actions...). Protected by CRON_SECRET (or NOTIFICATION_CRON_SECRET).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.NOTIFICATION_CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}` && request.nextUrl.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, at: new Date().toISOString(), results: await runLifecycleJobs() });
}
export const POST = GET;
