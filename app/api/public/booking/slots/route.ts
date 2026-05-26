import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { computeDoctorDaySlots } from '@/lib/appointmentSlotting';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';

/** Public: available / taken slots for a doctor on a calendar day */
export async function GET(request: NextRequest) {
  try {
    const content = await getMergedWebsiteContent();
    if (!content.appointmentRequestEnabled) {
      return NextResponse.json({ error: 'Booking disabled' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId') || '';
    const date = searchParams.get('date') || '';

    const result = await computeDoctorDaySlots(doctorId, date, { forPublicWebsite: true });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      doctor: result.doctor,
      slotDurationMinutes: result.slotDurationMinutes,
      slots: result.slots,
    });
  } catch (e) {
    console.error('GET /api/public/booking/slots', e);
    return NextResponse.json({ error: 'Failed to load slots' }, { status: 500 });
  }
}
