import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import { computeDoctorDaySlots } from '@/lib/appointmentSlotting';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized - Patient access only' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId') || '';
    const date = searchParams.get('date') || '';

    const result = await computeDoctorDaySlots(doctorId, date, { forPublicWebsite: false });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      doctor: result.doctor,
      slotDurationMinutes: result.slotDurationMinutes,
      slots: result.slots,
    });
  } catch (error) {
    console.error('GET /api/patient-portal/appointments/slots', error);
    return NextResponse.json({ error: 'Failed to load slots' }, { status: 500 });
  }
}
