import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { computeDoctorDaySlots } from '@/lib/appointmentSlotting';
import { requireServiceKey } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

// GET /api/service/bridge/slots?doctorId=&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const denied = requireServiceKey(request);
  if (denied) return denied;
  try {
    await dbConnect();
    const doctorId = request.nextUrl.searchParams.get('doctorId') || '';
    const date = request.nextUrl.searchParams.get('date') || '';
    const result = await computeDoctorDaySlots(doctorId, date, { forPublicWebsite: true });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({
      success: true,
      doctor: result.doctor,
      date,
      timeZone: result.timeZone,
      slotDurationMinutes: result.slotDurationMinutes,
      slots: result.slots,
    });
  } catch (e) {
    console.error('bridge/slots', e);
    return NextResponse.json({ success: false, error: 'Failed to load slots' }, { status: 500 });
  }
}
