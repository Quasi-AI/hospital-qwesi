import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import WalletTransaction from '@/models/WalletTransaction';
import WithdrawalRequest from '@/models/WithdrawalRequest';
import PayoutMethod from '@/models/PayoutMethod';
import { getFinanceSettings, money, releaseDueEarnings, walletForPractitioner } from '@/lib/finance';

const words = (s: string) => String(s || '').toLowerCase().replace(/^(dr|mr|mrs|ms)\.?\s+/i, '').split(/[^a-z]+/).filter((w) => w.length > 1);
/** Does the account holder name share at least one name with the practitioner's registered name? */
const nameMatches = (account: string, profile: string) => {
  const a = new Set(words(account));
  return words(profile).some((w) => a.has(w));
};

async function requirePractitioner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.user.role !== 'doctor') {
    return { error: NextResponse.json({ error: 'Wallets are for doctors and herbalists' }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  try {
    const auth = await requirePractitioner();
    if (auth.error) return auth.error;
    const { session } = auth;
    await dbConnect();
    const ownerId = String(session!.user.id);
    await walletForPractitioner(ownerId);
    await releaseDueEarnings(ownerId); // safety window over -> money becomes withdrawable
    const [wallet, ledger, withdrawals, settings] = await Promise.all([
      Wallet.findOne({ ownerId }).lean(),
      WalletTransaction.find({ ownerId }).sort({ createdAt: -1 }).limit(60).lean(),
      WithdrawalRequest.find({ ownerId }).sort({ createdAt: -1 }).limit(25).lean(),
      getFinanceSettings(),
    ]);
    return NextResponse.json({ wallet, ledger, withdrawals, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch wallet' }, { status: 400 });
  }
}

// Request a withdrawal. Money stays at Paystack: this only reserves the amount; an admin pays it out and marks it paid.
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePractitioner();
    if (auth.error) return auth.error;
    const { session } = auth;
    const body = await request.json();
    await dbConnect();

    const ownerId = String(session!.user.id);
    const [user, settings] = await Promise.all([User.findById(ownerId).select('name approvalStatus').lean() as any, getFinanceSettings()]);
    if (user?.approvalStatus !== 'approved') {
      return NextResponse.json({ error: 'Withdrawals open once your licence/credentials are verified by Qwesi.' }, { status: 403 });
    }

    const amount = money(Number(body.amount));
    if (!amount || amount < settings.minWithdrawal) {
      return NextResponse.json({ error: `Minimum withdrawal is ${settings.minWithdrawal}` }, { status: 400 });
    }
    const method = (await PayoutMethod.findOne({ _id: String(body.payoutMethodId || ''), ownerId }).lean().catch(() => null)) as any;
    if (!method) return NextResponse.json({ error: 'Choose one of your saved payout accounts' }, { status: 400 });

    // Brand-new payout accounts wait before first use, so a hijacked login cannot cash out instantly
    const ageHours = (Date.now() - new Date(method.createdAt).getTime()) / 3600_000;
    if (ageHours < settings.payoutMethodCooldownHours) {
      const left = Math.ceil(settings.payoutMethodCooldownHours - ageHours);
      return NextResponse.json({ error: `This payout account was added recently. You can withdraw to it in about ${left}h.` }, { status: 403 });
    }
    if (await WithdrawalRequest.exists({ ownerId, status: { $in: ['pending', 'approved'] } })) {
      return NextResponse.json({ error: 'You already have a withdrawal waiting to be paid.' }, { status: 409 });
    }

    const wallet = await walletForPractitioner(ownerId);
    await releaseDueEarnings(ownerId);

    // Atomic reserve: only succeeds if the balance is really there (no double spending by parallel requests)
    const reserved = await Wallet.findOneAndUpdate(
      { _id: wallet._id, availableBalance: { $gte: amount } },
      { $inc: { availableBalance: -amount, pendingBalance: amount } },
      { returnDocument: 'after' }
    );
    if (!reserved) return NextResponse.json({ error: 'Amount is more than your available balance' }, { status: 400 });

    const withdrawal = await WithdrawalRequest.create({
      walletId: String(wallet._id), ownerId, ownerRole: 'doctor', ownerName: user?.name || session!.user.email,
      amount, currency: wallet.currency, payoutMethod: method.type,
      accountName: method.accountName, accountNumber: method.accountNumber,
      bankCode: method.bankCode, bankName: method.bankName, mobileMoneyProvider: method.mobileMoneyProvider,
      status: 'pending', notes: String(body.notes || '').trim().slice(0, 300),
      nameMatchesProfile: nameMatches(method.accountName, user?.name || ''),
    });
    await WalletTransaction.create({
      walletId: String(wallet._id), ownerId, type: 'withdrawal_hold', status: 'settled', currency: wallet.currency,
      amount: -amount, withdrawalId: String(withdrawal._id), note: `Withdrawal to ${method.label || method.type}`,
    });
    return NextResponse.json({ wallet: reserved, withdrawal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Withdrawal request failed' }, { status: 400 });
  }
}
