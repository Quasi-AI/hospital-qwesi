import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Hospital from '@/models/Hospital';

// GET /api/service/hospital-dashboard
//
// Server-to-server endpoint for the Qwesi WhatsApp/AI assistant. It has no
// user session, so it authenticates with a static shared secret instead of
// NextAuth: send `x-api-key: <HOSPITAL_DASHBOARD_API_KEY>`.
//
// Returns every active hospital's latest self-reported capacity/status so
// the assistant can recommend where a patient should go. This intentionally
// does NOT reuse /api/dashboard, which is session-scoped to one logged-in
// user's role and returns a different shape.
const STALE_AFTER_HOURS = Number(process.env.HOSPITAL_CAPACITY_STALE_HOURS || 6);

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

    const hospitals = await Hospital.find({ isActive: true })
      .select('name city region phone capacity')
      .sort({ name: 1 })
      .lean();

    const staleCutoff = new Date(Date.now() - STALE_AFTER_HOURS * 60 * 60 * 1000);

    let accepting = 0;
    let limited = 0;
    let full = 0;
    let staleOrMissing = 0;

    const hospitalRows = hospitals.map((hospital: any) => {
      const capacity = hospital.capacity;
      const hasUpdate = Boolean(capacity?.updatedAt);
      const isStale = !hasUpdate || new Date(capacity.updatedAt) < staleCutoff;

      if (isStale) staleOrMissing += 1;
      if (capacity?.emergencyStatus === 'accepting') accepting += 1;
      else if (capacity?.emergencyStatus === 'limited') limited += 1;
      else if (capacity?.emergencyStatus === 'full') full += 1;

      return {
        name: hospital.name,
        location: [hospital.city, hospital.region].filter(Boolean).join(', '),
        phone: hospital.phone || '',
        latest_update: hasUpdate
          ? {
              emergency_status: capacity.emergencyStatus || 'unknown',
              emergency_beds_available: capacity.emergencyBedsAvailable ?? null,
              icu_beds_available: capacity.icuBedsAvailable ?? null,
              oxygen_available: Boolean(capacity.oxygenAvailable),
              maternity_status: capacity.maternityStatus || 'unknown',
              trauma_status: capacity.traumaStatus || 'unknown',
              created_at: capacity.updatedAt,
              is_stale: isStale,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        dashboard: {
          summary: {
            total_hospitals: hospitals.length,
            accepting,
            limited,
            full,
            stale_or_missing_updates: staleOrMissing,
            pending_requests: 0,
          },
          hospitals: hospitalRows,
        },
      },
    });
  } catch (error) {
    console.error('Error building service hospital dashboard:', error);
    return NextResponse.json({ success: false, error: 'Failed to load hospital dashboard' }, { status: 500 });
  }
}
