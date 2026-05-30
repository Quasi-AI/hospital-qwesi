import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyProviderLicense } from '@/lib/licenseVerification';

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
    const body = await request.json();
    const action = body.action as 'approve' | 'reject' | 'auto-verify';

    if (!['approve', 'reject', 'auto-verify'].includes(action)) {
      return NextResponse.json({ error: 'Invalid approval action' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user || !['doctor', 'staff'].includes(user.role)) {
      return NextResponse.json({ error: 'Doctor or staff member not found' }, { status: 404 });
    }

    if (action === 'approve') {
      user.approvalStatus = 'approved';
      user.approvalMethod = 'manual';
      user.approvedBy = session.user.email;
      user.approvedAt = new Date();
      user.rejectionReason = undefined;
      user.licenseVerification = {
        status: 'verified',
        method: 'manual',
        checkedAt: new Date(),
        message: body.note || 'Approved manually by an administrator.',
      };
    }

    if (action === 'reject') {
      user.approvalStatus = 'rejected';
      user.approvalMethod = undefined;
      user.approvedBy = undefined;
      user.approvedAt = undefined;
      user.rejectionReason = body.reason || 'Certificate could not be verified.';
      user.licenseVerification = {
        status: 'failed',
        method: 'manual',
        checkedAt: new Date(),
        message: user.rejectionReason,
      };
    }

    if (action === 'auto-verify') {
      const result = await verifyProviderLicense({
        name: user.name,
        email: user.email,
        role: user.role as 'doctor' | 'staff',
        licenseNumber: user.licenseNumber,
        licenseCertificate: user.licenseCertificate,
      });

      user.approvalStatus = result.autoApproved ? 'approved' : 'pending_verification';
      user.approvalMethod = result.autoApproved ? 'official_api' : undefined;
      user.approvedBy = result.autoApproved ? 'official-license-api' : undefined;
      user.approvedAt = result.autoApproved ? new Date() : undefined;
      user.rejectionReason = undefined;
      user.licenseVerification = {
        status: result.status,
        method: result.method || 'manual',
        checkedAt: new Date(),
        message: result.message,
        reference: result.reference,
      };
    }

    await user.save();
    const responseUser = user.toObject() as any;
    delete responseUser.password;

    return NextResponse.json({
      message: 'Approval status updated',
      user: responseUser,
    });
  } catch (error) {
    console.error('Approval update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
