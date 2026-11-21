import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import RefundRequest from '@/models/RefundRequest';
import WalletTransaction from '@/models/WalletTransaction';
import { processRefund, releaseEarningNow, setEarningDisputed } from '@/lib/finance';

async function admin() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === 'admin' ? s : null;
}

export async function GET(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await dbConnect();
  const status = request.nextUrl.searchParams.get('status');
  const filter = status && status !== 'all' ? { status } : {};
  const refunds = (await RefundRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean()) as any[];
  // How many refunds each practitioner has had: repeat offenders stand out
  const perDoctor = await RefundRequest.aggregate([{ $group: { _id: '$doctorId', total: { $sum: 1 } } }]);
  const counts = new Map(perDoctor.map((d: any) => [String(d._id), d.total]));
  return NextResponse.json({ refunds: refunds.map((r) => ({ ...r, practitionerRefundCount: counts.get(String(r.doctorId)) || 0 })) });
}

// action: "refund" (full, or partial with amount) | "deny" (releases the practitioner's earning) | "mark_done" (you refunded it manually in the Paystack dashboard)
export async function PATCH(request: NextRequest) {
  const session = await admin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, action, amount, note } = await request.json();
  await dbConnect();
  const adminId = String(session.user.email || session.user.id);
  const r = (await RefundRequest.findById(id)) as any;
  if (!r) return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });

  if (action === 'refund') {
    if (r.status !== 'pending_review') return NextResponse.json({ error: 'Already decided' }, { status: 409 });
    const done = await processRefund(id, { amount: amount ? Number(amount) : undefined, adminId, note });
    return NextResponse.json({ refund: done });
  }
  if (action === 'deny') {
    if (r.status !== 'pending_review') return NextResponse.json({ error: 'Already decided' }, { status: 409 });
    if (!String(note || '').trim()) return NextResponse.json({ error: 'Explain the decision to the patient' }, { status: 400 });
    r.status = 'denied'; r.adminNote = note; r.reviewedBy = adminId; r.reviewedAt = new Date();
    await r.save();
    await setEarningDisputed(String(r.appointmentId), false); // practitioner's money is released on schedule again
    return NextResponse.json({ refund: r });
  }
  if (action === 'mark_done') {
    if (r.status !== 'manual_required') return NextResponse.json({ error: 'Nothing to confirm' }, { status: 409 });
    r.status = 'processed'; r.adminNote = `${r.adminNote || ''} | Refunded manually: ${note || ''}`.trim(); r.reviewedBy = adminId;
    await r.save();
    return NextResponse.json({ refund: r });
  }
  if (action === 'release_earning') { // a very short/unstarted session that was checked and was fine
    const ok = await releaseEarningNow(String(r.appointmentId), adminId);
    return NextResponse.json({ released: ok });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
