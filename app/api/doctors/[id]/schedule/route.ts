import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import User from '@/models/User';
import DoctorSchedule from '@/models/DoctorSchedule';
import { getEffectiveDoctorSchedule, getPracticeWorkingHoursFallback } from '@/lib/appointmentSlotting';

const DAY_SET = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

function canAccessDoctorSchedule(session: { user: { id?: string; role?: string } }, doctorId: string) {
  const role = session.user.role || '';
  if (role === 'admin' || role === 'staff') return true;
  if (role === 'doctor' && session.user.id === doctorId) return true;
  return false;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: doctorId } = await params;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    if (!canAccessDoctorSchedule(session, doctorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const user = await User.findById(doctorId).select('role name').lean();
    if (!user || (user as { role?: string }).role !== 'doctor') {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const raw = await DoctorSchedule.findOne({ doctorId }).lean();
    const defaults = await getPracticeWorkingHoursFallback();
    const effective = await getEffectiveDoctorSchedule(doctorId);

    return NextResponse.json({
      doctorId,
      saved: raw
        ? {
            slotDurationMinutes: (raw as { slotDurationMinutes?: number }).slotDurationMinutes,
            websiteBookingEnabled: (raw as { websiteBookingEnabled?: boolean }).websiteBookingEnabled,
            workingHours: (raw as { workingHours?: { start?: string; end?: string; days?: string[] } }).workingHours,
          }
        : null,
      practiceDefaults: defaults,
      effective,
    });
  } catch (e) {
    console.error('GET /api/doctors/[id]/schedule', e);
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: doctorId } = await params;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const role = session.user.role || '';
    const canEdit =
      role === 'admin' || role === 'staff' || (role === 'doctor' && session.user.id === doctorId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const slotDurationMinutes = Math.min(
      180,
      Math.max(5, parseInt(String(body.slotDurationMinutes ?? 30), 10) || 30)
    );
    const websiteBookingEnabled = body.websiteBookingEnabled !== false;
    const wh = body.workingHours || {};
    const start = String(wh.start || '09:00').trim();
    const end = String(wh.end || '17:00').trim();
    const daysRaw = Array.isArray(wh.days) ? wh.days : [];
    const days = daysRaw
      .map((d: string) => String(d).toLowerCase().trim())
      .filter((d: string) => DAY_SET.has(d));

    const practice = await getPracticeWorkingHoursFallback();
    const workingHours = {
      start: start || practice.start,
      end: end || practice.end,
      days: days.length ? days : practice.days,
    };

    await dbConnect();
    const user = await User.findById(doctorId).select('role').lean();
    if (!user || (user as { role?: string }).role !== 'doctor') {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    await DoctorSchedule.findOneAndUpdate(
      { doctorId: new mongoose.Types.ObjectId(doctorId) },
      {
        $set: {
          doctorId: new mongoose.Types.ObjectId(doctorId),
          slotDurationMinutes,
          websiteBookingEnabled,
          workingHours,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const effective = await getEffectiveDoctorSchedule(doctorId);
    return NextResponse.json({ ok: true, effective });
  } catch (e) {
    console.error('PUT /api/doctors/[id]/schedule', e);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}
