import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import User from '@/models/User';
import DoctorSchedule from '@/models/DoctorSchedule';
import { cleanWeekly, cleanTimeOff, cleanOverrides } from '@/lib/availability';
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
  if ((role === 'doctor' || role === 'pharmacy') && session.user.id === doctorId) return true;
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
    if (!user || !['doctor', 'pharmacy'].includes((user as { role?: string }).role || '')) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
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
            ...(raw as object),
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
      role === 'admin' || role === 'staff' || ((role === 'doctor' || role === 'pharmacy') && session.user.id === doctorId);
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
    if (!user || !['doctor', 'pharmacy'].includes((user as { role?: string }).role || '')) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const num = (v: unknown, min: number, max: number, def: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
    };
    const extra: Record<string, unknown> = {};
    if (body.weekly) {
      const weekly = cleanWeekly(body.weekly);
      extra.weekly = weekly;
      const on = Object.entries(weekly).filter(([, p]) => p.enabled);
      if (on.length) {
        extra['workingHours'] = {
          days: on.map(([d]) => d),
          start: on.flatMap(([, p]) => p.ranges.map((r) => r.start)).sort()[0],
          end: on.flatMap(([, p]) => p.ranges.map((r) => r.end)).sort().slice(-1)[0],
        };
      }
    }
    if (body.timeOff) extra.timeOff = cleanTimeOff(body.timeOff);
    if (body.dateOverrides) extra.dateOverrides = cleanOverrides(body.dateOverrides);
    if ('bufferMinutes' in body) extra.bufferMinutes = num(body.bufferMinutes, 0, 120, 0);
    if ('minNoticeHours' in body) extra.minNoticeHours = num(body.minNoticeHours, 0, 720, 0);
    if ('maxAdvanceDays' in body) extra.maxAdvanceDays = num(body.maxAdvanceDays, 1, 730, 90);
    if ('maxPerDay' in body) extra.maxPerDay = num(body.maxPerDay, 0, 200, 0);
    if ('paused' in body) {
      extra.paused = Boolean(body.paused);
      const until = body.pausedUntil ? new Date(body.pausedUntil) : null;
      extra.pausedUntil = extra.paused && until && !Number.isNaN(until.getTime()) ? until : null;
      extra.pauseMessage = String(body.pauseMessage || '').slice(0, 200);
    }

    await DoctorSchedule.findOneAndUpdate(
      { doctorId: new mongoose.Types.ObjectId(doctorId) },
      {
        $set: {
          doctorId: new mongoose.Types.ObjectId(doctorId),
          ...('slotDurationMinutes' in body ? { slotDurationMinutes } : {}),
          ...('websiteBookingEnabled' in body ? { websiteBookingEnabled } : {}),
          ...(body.workingHours ? { workingHours } : {}),
          ...extra,
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
