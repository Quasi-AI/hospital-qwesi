import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import User from '@/models/User';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { action, reason } = await request.json();
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid approval action' }, { status: 400 });
    }

    await dbConnect();
    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    patient.approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    patient.approvedBy = action === 'approve' ? session.user.email : undefined;
    patient.approvedAt = action === 'approve' ? new Date() : undefined;
    patient.rejectionReason = action === 'reject' ? (reason || 'Patient signup was not approved.') : undefined;
    await patient.save();

    await User.findOneAndUpdate(
      { email: patient.email },
      {
        $set: {
          approvalStatus: patient.approvalStatus,
          approvedBy: patient.approvedBy,
          approvedAt: patient.approvedAt,
          rejectionReason: patient.rejectionReason,
        },
      }
    );

    return NextResponse.json({ message: 'Patient approval updated', patient });
  } catch (error) {
    console.error('Patient approval error:', error);
    return NextResponse.json({ error: 'Failed to update patient approval.' }, { status: 500 });
  }
}
