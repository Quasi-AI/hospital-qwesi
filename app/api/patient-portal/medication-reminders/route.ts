import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Notification from '@/models/Notification';
import { scheduleMedicationReminders } from '@/lib/notifications/notification-service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized - Patient access only' }, { status: 401 });
    }

    await dbConnect();
    const patient = await Patient.findOne({ email: session.user.email }).select('_id').lean();
    if (!patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    const reminders = await Notification.find({
      recipientId: String(patient._id),
      recipientType: 'patient',
      type: 'medication_reminder',
      status: { $in: ['pending', 'sent', 'failed'] },
    })
      .sort({ scheduledFor: 1, createdAt: -1 })
      .limit(80)
      .lean();

    return NextResponse.json({ reminders });
  } catch (error: any) {
    console.error('Medication reminders fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load medication reminders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized - Patient access only' }, { status: 401 });
    }

    const body = await request.json();
    const medication = {
      name: String(body.name || '').trim(),
      dosage: String(body.dosage || '').trim(),
      frequency: String(body.frequency || '').trim(),
      duration: String(body.duration || '').trim(),
      instructions: String(body.instructions || '').trim(),
    };

    if (!medication.name) {
      return NextResponse.json({ error: 'Medication name is required' }, { status: 400 });
    }
    if (!medication.frequency) {
      return NextResponse.json({ error: 'Frequency is required' }, { status: 400 });
    }

    await dbConnect();
    const patient = await Patient.findOne({ email: session.user.email }).select('_id').lean();
    if (!patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    const result = await scheduleMedicationReminders(String(patient._id), [medication], {
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Could not schedule reminders' }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Medication reminders create error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create medication reminders' }, { status: 500 });
  }
}
