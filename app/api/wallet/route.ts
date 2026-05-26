import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import WithdrawalRequest from '@/models/WithdrawalRequest';
import PayoutMethod from '@/models/PayoutMethod';

async function getOrCreateWallet(session: any) {
  const ownerId = session.user.id;
  const ownerRole = session.user.role;
  if (!['doctor', 'staff'].includes(ownerRole)) {
    throw new Error('Wallets are only available for doctors and staff');
  }

  return Wallet.findOneAndUpdate(
    { ownerId },
    {
      $setOnInsert: {
        ownerId,
        ownerRole,
        ownerName: session.user.name || session.user.email,
        ownerEmail: session.user.email,
        currency: 'GHS',
        availableBalance: 0,
        pendingBalance: 0,
        lifetimeEarnings: 0,
      },
      $set: {
        ownerName: session.user.name || session.user.email,
        ownerEmail: session.user.email,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const wallet = await getOrCreateWallet(session);
    const withdrawals = await WithdrawalRequest.find({ ownerId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    return NextResponse.json({ wallet, withdrawals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch wallet' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    let payoutMethod = body.payoutMethod === 'bank' ? 'bank' : 'mobile_money';
    let accountName = String(body.accountName || '').trim();
    let accountNumber = String(body.accountNumber || '').trim();
    let bankCode = String(body.bankCode || '').trim();
    let bankName = String(body.bankName || '').trim();
    let mobileMoneyProvider = String(body.mobileMoneyProvider || '').trim();
    const payoutMethodId = String(body.payoutMethodId || '').trim();

    if (!amount || amount <= 0 || !accountName || !accountNumber) {
      return NextResponse.json({ error: 'Amount, account name, and account number are required' }, { status: 400 });
    }

    await dbConnect();
    const wallet = await getOrCreateWallet(session);

    if (payoutMethodId) {
      const savedMethod = await PayoutMethod.findOne({ _id: payoutMethodId, ownerId: session.user.id }).lean() as any;
      if (!savedMethod) {
        return NextResponse.json({ error: 'Saved payout method not found' }, { status: 404 });
      }
      payoutMethod = savedMethod.type;
      accountName = savedMethod.accountName;
      accountNumber = savedMethod.accountNumber;
      bankCode = savedMethod.bankCode || '';
      bankName = savedMethod.bankName || '';
      mobileMoneyProvider = savedMethod.mobileMoneyProvider || '';
    }

    if (amount > wallet.availableBalance) {
      return NextResponse.json({ error: 'Withdrawal amount exceeds available balance' }, { status: 400 });
    }

    wallet.availableBalance -= amount;
    wallet.pendingBalance += amount;
    await wallet.save();

    const withdrawal = await WithdrawalRequest.create({
      walletId: wallet._id.toString(),
      ownerId: session.user.id,
      ownerRole: session.user.role,
      ownerName: session.user.name || session.user.email,
      amount,
      currency: 'GHS',
      payoutMethod,
      accountName,
      accountNumber,
      bankCode,
      bankName,
      mobileMoneyProvider,
      status: 'pending',
      notes: String(body.notes || '').trim(),
    });

    return NextResponse.json({ wallet, withdrawal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Withdrawal request failed' }, { status: 400 });
  }
}
