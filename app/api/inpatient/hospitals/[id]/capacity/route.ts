import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Hospital from '@/models/Hospital';

const EMERGENCY_STATUSES = ['accepting', 'limited', 'full'];
const CARE_STATUSES = ['accepting', 'limited', 'full', 'not-offered'];

function canManageHospital(session: any, hospital: any): boolean {
  if (session.user?.role === 'admin') return true;
  if (session.user?.role !== 'hospital') return false;

  const email = String(session.user?.email || '').toLowerCase();
  const sameOwner = hospital.userId && String(hospital.userId) === String(session.user?.id);
  const sameLogin = hospital.loginEmail && hospital.loginEmail.toLowerCase() === email;
  return Boolean(sameOwner || sameLogin);
}

// PATCH /api/inpatient/hospitals/[id]/capacity
// Updates a single hospital's live capacity/status snapshot. Callable by the
// hospital's own linked user account or by a platform admin.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const hospital = await Hospital.findById(params.id);
    if (!hospital) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }

    if (!canManageHospital(session, hospital)) {
      return NextResponse.json(
        { error: 'You do not have permission to update this hospital\u2019s status' },
        { status: 403 }
      );
    }

    const data = await request.json();

    if (data.emergencyStatus !== undefined && !EMERGENCY_STATUSES.includes(data.emergencyStatus)) {
      return NextResponse.json({ error: `emergencyStatus must be one of ${EMERGENCY_STATUSES.join(', ')}` }, { status: 400 });
    }
    if (data.maternityStatus !== undefined && !CARE_STATUSES.includes(data.maternityStatus)) {
      return NextResponse.json({ error: `maternityStatus must be one of ${CARE_STATUSES.join(', ')}` }, { status: 400 });
    }
    if (data.traumaStatus !== undefined && !CARE_STATUSES.includes(data.traumaStatus)) {
      return NextResponse.json({ error: `traumaStatus must be one of ${CARE_STATUSES.join(', ')}` }, { status: 400 });
    }

    const capacity: Record<string, unknown> = {
      ...(hospital.capacity ? hospital.capacity.toObject?.() ?? hospital.capacity : {}),
      updatedAt: new Date(),
      updatedBy: session.user?.email,
    };

    if (data.emergencyStatus !== undefined) capacity.emergencyStatus = data.emergencyStatus;
    if (data.emergencyBedsAvailable !== undefined) capacity.emergencyBedsAvailable = Number(data.emergencyBedsAvailable);
    if (data.icuBedsAvailable !== undefined) capacity.icuBedsAvailable = Number(data.icuBedsAvailable);
    if (data.oxygenAvailable !== undefined) capacity.oxygenAvailable = Boolean(data.oxygenAvailable);
    if (data.maternityStatus !== undefined) capacity.maternityStatus = data.maternityStatus;
    if (data.traumaStatus !== undefined) capacity.traumaStatus = data.traumaStatus;
    if (data.notes !== undefined) capacity.notes = String(data.notes).slice(0, 500);

    hospital.capacity = capacity as any;
    await hospital.save();

    return NextResponse.json({ hospital });
  } catch (error: unknown) {
    console.error('Error updating hospital capacity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update hospital capacity';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
