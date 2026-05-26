import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import PayoutMethod from '@/models/PayoutMethod';

function isWalletUser(session: any) {
  return session?.user?.email && ['doctor', 'staff'].includes(session.user.role);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isWalletUser(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    await dbConnect();

    const method = await PayoutMethod.findOne({ _id: id, ownerId: session!.user.id });
    if (!method) {
      return NextResponse.json({ error: 'Payout method not found' }, { status: 404 });
    }

    if (body.isDefault) {
      await PayoutMethod.updateMany({ ownerId: session!.user.id }, { $set: { isDefault: false } });
      method.isDefault = true;
      await method.save();
    }

    return NextResponse.json({ method });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update payout method' }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isWalletUser(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const method = await PayoutMethod.findOneAndDelete({ _id: id, ownerId: session!.user.id });
    if (!method) {
      return NextResponse.json({ error: 'Payout method not found' }, { status: 404 });
    }

    if (method.isDefault) {
      const nextDefault = await PayoutMethod.findOne({ ownerId: session!.user.id }).sort({ createdAt: -1 });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    return NextResponse.json({ message: 'Payout method deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete payout method' }, { status: 400 });
  }
}
