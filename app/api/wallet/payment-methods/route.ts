import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import PayoutMethod from '@/models/PayoutMethod';

function assertWalletUser(session: any) {
  const role = session?.user?.role;
  if (!session?.user?.email || !['doctor', 'staff'].includes(role)) {
    throw new Error('Payout methods are only available for doctors and staff');
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    assertWalletUser(session);

    await dbConnect();
    const methods = await PayoutMethod.find({ ownerId: session!.user.id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ methods });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch payout methods' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    assertWalletUser(session);

    const body = await request.json();
    const type = body.type === 'bank' ? 'bank' : 'mobile_money';
    const label = String(body.label || '').trim();
    const accountName = String(body.accountName || '').trim();
    const accountNumber = String(body.accountNumber || '').trim();
    const mobileMoneyProvider = String(body.mobileMoneyProvider || '').trim();
    const bankName = String(body.bankName || '').trim();
    const bankCode = String(body.bankCode || '').trim();
    const isDefault = Boolean(body.isDefault);

    if (!label || !accountName || !accountNumber) {
      return NextResponse.json({ error: 'Label, account name, and account number are required' }, { status: 400 });
    }

    if (type === 'bank' && !bankName) {
      return NextResponse.json({ error: 'Bank name is required for bank payout methods' }, { status: 400 });
    }

    if (type === 'mobile_money' && !mobileMoneyProvider) {
      return NextResponse.json({ error: 'Mobile money provider is required' }, { status: 400 });
    }

    await dbConnect();

    const hasExisting = await PayoutMethod.exists({ ownerId: session!.user.id });
    if (isDefault || !hasExisting) {
      await PayoutMethod.updateMany({ ownerId: session!.user.id }, { $set: { isDefault: false } });
    }

    const method = await PayoutMethod.create({
      ownerId: session!.user.id,
      ownerRole: session!.user.role,
      ownerName: session!.user.name || session!.user.email,
      type,
      label,
      accountName,
      accountNumber,
      mobileMoneyProvider,
      bankName,
      bankCode,
      isDefault: isDefault || !hasExisting,
    });

    return NextResponse.json({ method }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save payout method' }, { status: 400 });
  }
}
