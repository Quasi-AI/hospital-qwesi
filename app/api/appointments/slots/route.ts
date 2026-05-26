import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import { computeDoctorDaySlots } from '@/lib/appointmentSlotting';

/** Staff / doctor: same slot grid as public (no website-only restriction on viewing) */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = session.user.role || '';
    if (!['admin', 'doctor', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId') || '';
    const date = searchParams.get('date') || '';
    const excludeAppointmentId = searchParams.get('excludeAppointmentId')?.trim() || '';

    if (role === 'doctor' && session.user.id && doctorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await computeDoctorDaySlots(doctorId, date, {
      forPublicWebsite: false,
      excludeAppointmentId: excludeAppointmentId || undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      doctor: result.doctor,
      slotDurationMinutes: result.slotDurationMinutes,
      slots: result.slots,
    });
  } catch (e) {
    console.error('GET /api/appointments/slots', e);
    return NextResponse.json({ error: 'Failed to load slots' }, { status: 500 });
  }
}
