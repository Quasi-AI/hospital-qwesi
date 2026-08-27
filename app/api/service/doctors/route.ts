import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/service/doctors
//
// Server-to-server endpoint for the Qwesi WhatsApp/AI assistant, authenticated
// with `x-api-key: <HOSPITAL_DASHBOARD_API_KEY>` (same shared secret as the
// other /api/service/* endpoints). Returns admin-approved doctors so the
// assistant can recommend a specific one by name instead of a generic "see
// a doctor."
//
// This intentionally does NOT use getEffectiveProviderApprovalStatus() (used
// by /api/public/booking/doctors) — that additionally requires a verified
// photo + license certificate on file, which is the right bar for letting a
// patient self-book online, but too strict here: a doctor an admin has
// already approved can be perfectly real and worth mentioning by name in a
// chat reply even before their booking profile/photo is fully filled out.
export async function GET(request: NextRequest) {
  try {
    const providedKey = request.headers.get('x-api-key');
    const expectedKey = process.env.HOSPITAL_DASHBOARD_API_KEY;

    if (!expectedKey) {
      console.error('HOSPITAL_DASHBOARD_API_KEY is not configured on the server.');
      return NextResponse.json({ success: false, error: 'Service not configured' }, { status: 500 });
    }
    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const specialization = request.nextUrl.searchParams.get('specialization');

    const query: Record<string, unknown> = {
      role: 'doctor',
      approvalStatus: 'approved',
    };
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    const doctors = await User.find(query)
      .select('name specialization department')
      .sort({ name: 1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      doctors: doctors.map((doctor: any) => ({
        name: doctor.name,
        specialization: doctor.specialization || '',
        department: doctor.department || '',
      })),
    });
  } catch (error) {
    console.error('Error in service/doctors endpoint:', error);
    return NextResponse.json({ success: false, error: 'Failed to load doctors' }, { status: 500 });
  }
}

