import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { processScheduledNotifications } from '@/lib/notifications/notification-service';

// Sends due reminders even when no external cron is configured (at most once a minute per server instance).
let lastSweep = 0;

/** In-app items not yet marked read (status still pending or sent). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    if (Date.now() - lastSweep > 60_000) {
      lastSweep = Date.now();
      processScheduledNotifications().catch((e) => console.error('reminder sweep', e));
    }

    const now = new Date();
    const count = await Notification.countDocuments({
      recipientId: session.user.id,
      status: { $in: ['pending', 'sent'] },
      // reminders scheduled for later are not unread yet
      $or: [{ scheduledFor: { $exists: false } }, { scheduledFor: null }, { scheduledFor: { $lte: now } }],
    });

    return NextResponse.json({ count });
  } catch (error: unknown) {
    console.error('GET unread-count error:', error);
    return NextResponse.json(
      { error: 'Failed to count notifications', count: 0 },
      { status: 500 }
    );
  }
}
