import { NextRequest, NextResponse } from 'next/server';
import {
  processScheduledNotifications,
  retryFailedNotifications,
} from '@/lib/notifications/notification-service';

// This endpoint should be called by a cron job service (e.g., Vercel Cron, external scheduler)
// It processes scheduled notifications and retries failed ones

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for production)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.NOTIFICATION_CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process scheduled notifications
    const scheduledResult = await processScheduledNotifications();
    
    // Retry failed notifications
    const retryResult = await retryFailedNotifications();

    return NextResponse.json({
      success: true,
      scheduled: scheduledResult,
      retried: retryResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Same as GET, for flexibility
  return GET(request);
}
