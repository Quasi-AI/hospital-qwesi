import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';

export const dynamic = 'force-dynamic';

/** Marks every unread in-app notification of the signed-in user as read. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const r = await Notification.updateMany(
    { recipientId: session.user.id, status: { $in: ['pending', 'sent'] } },
    { $set: { status: 'read', readAt: new Date() } },
  );
  return NextResponse.json({ ok: true, updated: r.modifiedCount });
}
