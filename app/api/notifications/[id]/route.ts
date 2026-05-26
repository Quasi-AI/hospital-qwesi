import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { sendNotification, markAsRead } from '@/lib/notifications/notification-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const notification = await Notification.findById(id);
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Non-admin users can only see their own notifications
    if (session.user?.role !== 'admin' && notification.recipientId !== session.user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(notification);
  } catch (error: any) {
    console.error('GET notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    await dbConnect();

    const notification = await Notification.findById(id);
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Non-admin users can only update their own notifications
    if (session.user?.role !== 'admin' && notification.recipientId !== session.user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle specific actions
    if (body.action === 'markAsRead') {
      const success = await markAsRead(id, notification.recipientId);
      if (success) {
        const updated = await Notification.findById(id);
        return NextResponse.json(updated);
      }
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 400 });
    }

    if (body.action === 'markAsUnread') {
      const updated = await Notification.findByIdAndUpdate(
        id,
        { status: 'sent', readAt: null },
        { new: true }
      );
      return NextResponse.json(updated);
    }

    if (body.action === 'retry') {
      // Only admin can retry
      if (session.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      const result = await sendNotification(id);
      if (result.success) {
        const updated = await Notification.findById(id);
        return NextResponse.json(updated);
      }
      return NextResponse.json({ error: result.error || 'Failed to resend' }, { status: 400 });
    }

    // General update (admin only)
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await Notification.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PUT notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete notifications
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const notification = await Notification.findByIdAndDelete(id);
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error: any) {
    console.error('DELETE notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
