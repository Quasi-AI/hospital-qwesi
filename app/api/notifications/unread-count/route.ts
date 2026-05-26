import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';

/** In-app items not yet marked read (status still pending or sent). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const count = await Notification.countDocuments({
      recipientId: session.user.id,
      status: { $in: ['pending', 'sent'] },
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
