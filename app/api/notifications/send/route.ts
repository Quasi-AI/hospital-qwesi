import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  sendAppointmentReminder,
  sendLabResultNotification,
  sendPaymentDueReminder,
  sendMedicationReminder,
  sendFollowUpReminder,
  scheduleAppointmentReminder,
} from '@/lib/notifications/notification-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and staff can trigger notifications
    if (!['admin', 'staff', 'doctor'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { type, entityId, schedule, reminderMinutes, medicationData } = body;

    if (!type || !entityId) {
      return NextResponse.json(
        { error: 'type and entityId are required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'appointment_reminder':
        if (schedule) {
          result = await scheduleAppointmentReminder(entityId, reminderMinutes);
        } else {
          result = await sendAppointmentReminder(entityId);
        }
        break;

      case 'lab_result':
        result = await sendLabResultNotification(entityId);
        break;

      case 'payment_due':
        result = await sendPaymentDueReminder(entityId);
        break;

      case 'medication_reminder':
        if (!medicationData) {
          return NextResponse.json(
            { error: 'medicationData is required for medication reminders' },
            { status: 400 }
          );
        }
        result = await sendMedicationReminder(entityId, medicationData);
        break;

      case 'follow_up':
        result = await sendFollowUpReminder(entityId);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
