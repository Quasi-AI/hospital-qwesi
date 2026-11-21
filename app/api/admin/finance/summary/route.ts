import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import Wallet from '@/models/Wallet';
import WalletTransaction from '@/models/WalletTransaction';
import WithdrawalRequest from '@/models/WithdrawalRequest';
import RefundRequest from '@/models/RefundRequest';
import { FINANCE_DEFAULTS, getFinanceSettings } from '@/lib/finance';

async function admin() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === 'admin' ? s : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await dbConnect();
  const [settings, wallets, earnings, withdrawals, refunds, review] = await Promise.all([
    getFinanceSettings(),
    Wallet.aggregate([{ $group: { _id: '$currency', held: { $sum: '$heldBalance' }, available: { $sum: '$availableBalance' }, inPayout: { $sum: '$pendingBalance' }, count: { $sum: 1 } } }]),
    WalletTransaction.aggregate([{ $match: { type: 'earning' } }, { $group: { _id: '$currency', gross: { $sum: '$gross' }, commission: { $sum: '$commission' }, net: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    WithdrawalRequest.aggregate([{ $group: { _id: { currency: '$currency', status: '$status' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    RefundRequest.aggregate([{ $group: { _id: { currency: '$currency', status: '$status' }, total: { $sum: '$refundAmount' }, count: { $sum: 1 } } }]),
    WalletTransaction.countDocuments({ type: 'earning', status: 'held', completedAt: { $exists: true }, releaseAt: { $exists: false } }),
  ]);
  return NextResponse.json({ settings, wallets, earnings, withdrawals, refunds, needsReleaseReview: review });
}

export async function PATCH(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const b = await request.json();
  const num = (v: unknown, min: number, max: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const cur = await getFinanceSettings();
  const finance = {
    commissionPercent: num(b.commissionPercent, 0, 60, cur.commissionPercent),
    holdHours: num(b.holdHours, 0, 720, cur.holdHours),
    minWithdrawal: num(b.minWithdrawal, 0, 1_000_000, cur.minWithdrawal),
    payoutMethodCooldownHours: num(b.payoutMethodCooldownHours, 0, 720, cur.payoutMethodCooldownHours),
    refundWindowDays: num(b.refundWindowDays, 1, 60, cur.refundWindowDays),
    noShowGraceMinutes: num(b.noShowGraceMinutes, 5, 120, cur.noShowGraceMinutes),
  };
  await dbConnect();
  await Settings.findOneAndUpdate({}, { $set: { finance } }, { upsert: true });
  return NextResponse.json({ settings: { ...FINANCE_DEFAULTS, ...finance } });
}
