import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import WalletTransaction from '@/models/WalletTransaction';
import WithdrawalRequest from '@/models/WithdrawalRequest';
import User from '@/models/User';

async function admin() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === 'admin' ? s : null;
}

export async function GET(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await dbConnect();
  const status = request.nextUrl.searchParams.get('status');
  const filter = status && status !== 'all' ? { status } : {};
  const list = (await WithdrawalRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean()) as any[];
  const owners = await User.find({ _id: { $in: list.map((w) => w.ownerId) } }).select('email phone approvalStatus practitionerType').lean();
  const byId = new Map(owners.map((o: any) => [String(o._id), o]));
  return NextResponse.json({ withdrawals: list.map((w) => ({ ...w, owner: byId.get(String(w.ownerId)) || null })) });
}

// action: "mark_paid" (after you sent the money from Paystack / MoMo) | "reject" (returns the money to the wallet)
export async function PATCH(request: NextRequest) {
  const session = await admin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, action, reference, note } = await request.json();
  await dbConnect();

  const w = (await WithdrawalRequest.findById(id).lean()) as any;
  if (!w) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
  const adminId = String(session.user.email || session.user.id);

  if (action === 'mark_paid') {
    if (!String(reference || '').trim()) return NextResponse.json({ error: 'Enter the payout reference (Paystack transfer code or MoMo transaction ID)' }, { status: 400 });
    // Atomic status change: paying twice is impossible
    const done = await WithdrawalRequest.findOneAndUpdate(
      { _id: id, status: { $in: ['pending', 'approved'] } },
      { $set: { status: 'paid', payoutReference: String(reference).trim(), reviewedBy: adminId, reviewedAt: new Date(), notes: note ? `${w.notes || ''} | ${note}` : w.notes } },
      { returnDocument: 'after' }
    );
    if (!done) return NextResponse.json({ error: 'This withdrawal was already handled' }, { status: 409 });
    await Wallet.updateOne({ _id: w.walletId }, { $inc: { pendingBalance: -w.amount } });
    await WalletTransaction.create({ walletId: w.walletId, ownerId: w.ownerId, type: 'withdrawal_paid', status: 'settled', currency: w.currency, amount: 0, withdrawalId: String(w._id), reference: String(reference).trim(), createdBy: adminId, note: `Paid out ${w.currency} ${w.amount}` });
    return NextResponse.json({ withdrawal: done });
  }

  if (action === 'reject') {
    if (!String(note || '').trim()) return NextResponse.json({ error: 'Give a reason so the practitioner knows why' }, { status: 400 });
    const done = await WithdrawalRequest.findOneAndUpdate(
      { _id: id, status: { $in: ['pending', 'approved'] } },
      { $set: { status: 'rejected', notes: `${w.notes || ''} | Rejected: ${note}`, reviewedBy: adminId, reviewedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!done) return NextResponse.json({ error: 'This withdrawal was already handled' }, { status: 409 });
    await Wallet.updateOne({ _id: w.walletId }, { $inc: { pendingBalance: -w.amount, availableBalance: w.amount } });
    await WalletTransaction.create({ walletId: w.walletId, ownerId: w.ownerId, type: 'withdrawal_released', status: 'settled', currency: w.currency, amount: w.amount, withdrawalId: String(w._id), createdBy: adminId, note: `Rejected: ${note}` });
    return NextResponse.json({ withdrawal: done });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
