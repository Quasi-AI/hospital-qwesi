import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { createNotification } from '@/lib/notifications/notification-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const recipientId = searchParams.get('recipientId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};

    // Non-admin users can only see their own notifications
    if (session.user?.role !== 'admin') {
      query.recipientId = session.user?.id;
    } else if (recipientId) {
      query.recipientId = recipientId;
    }

    if (type) query.type = type;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    
    // Stats
    const stats = await Notification.aggregate([
      { $match: session.user?.role === 'admin' ? {} : { recipientId: session.user?.id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sentToday = await Notification.countDocuments({
      ...(session.user?.role !== 'admin' ? { recipientId: session.user?.id } : {}),
      sentAt: { $gte: today },
    });

    return NextResponse.json({
      notifications,
      total,
      stats: {
        pending: stats.find(s => s._id === 'pending')?.count || 0,
        sent: stats.find(s => s._id === 'sent')?.count || 0,
        failed: stats.find(s => s._id === 'failed')?.count || 0,
        read: stats.find(s => s._id === 'read')?.count || 0,
        sentToday,
      },
    });
  } catch (error: any) {
    console.error('GET notifications error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create notifications manually
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    const result = await createNotification({
      type: body.type || 'system',
      recipientId: body.recipientId,
      recipientType: body.recipientType || 'patient',
      recipientEmail: body.recipientEmail,
      recipientPhone: body.recipientPhone,
      title: body.title,
      message: body.message,
      channels: body.channels,
      priority: body.priority,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      relatedEntity: body.relatedEntity,
      metadata: body.metadata,
      sendImmediately: body.sendImmediately !== false,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}
