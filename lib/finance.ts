import mongoose from 'mongoose';
import Appointment from '@/models/Appointment';
import PaystackTransaction from '@/models/PaystackTransaction';
import RefundRequest from '@/models/RefundRequest';
import Settings from '@/models/Settings';
import TelemedicineSession from '@/models/TelemedicineSession';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import WalletTransaction from '@/models/WalletTransaction';
import { getPaystackSettings } from '@/lib/paystackSettings';
import { normalizeCurrency } from '@/lib/practitioner-currency';
import { toPaystackSubunit } from '@/lib/qwesi-pricing';

export type FinanceSettings = {
  commissionPercent: number;
  holdHours: number;
  minWithdrawal: number;
  payoutMethodCooldownHours: number;
  refundWindowDays: number;
  noShowGraceMinutes: number;
};

export const FINANCE_DEFAULTS: FinanceSettings = {
  commissionPercent: 10,
  holdHours: 24,
  minWithdrawal: 10,
  payoutMethodCooldownHours: 24,
  refundWindowDays: 7,
  noShowGraceMinutes: 15,
};

export const money = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const s = (await Settings.findOne().select('finance').lean()) as { finance?: Partial<FinanceSettings> } | null;
  return { ...FINANCE_DEFAULTS, ...(s?.finance || {}) };
}

export async function walletForPractitioner(userId: string) {
  const user = (await User.findById(userId).select('name email role currency').lean()) as any;
  if (!user) throw new Error('Practitioner not found');
  return Wallet.findOneAndUpdate(
    { ownerId: String(userId) },
    {
      $setOnInsert: {
        ownerId: String(userId),
        ownerRole: 'doctor',
        currency: normalizeCurrency(user.currency),
        availableBalance: 0, heldBalance: 0, pendingBalance: 0, lifetimeEarnings: 0, lifetimeCommission: 0,
      },
      $set: { ownerName: user.name || user.email, ownerEmail: user.email },
    },
    { upsert: true, returnDocument: 'after' }
  );
}

/**
 * A patient's paid consultation has been booked: credit the practitioner (net of commission)
 * into their HELD balance. Nothing is withdrawable until the consultation is completed and the
 * safety window has passed. Safe to call twice (one earning per appointment).
 */
export async function recordConsultationEarning(params: { transactionId: string; appointmentId: string; sessionId?: string }) {
  try {
    const tx = (await PaystackTransaction.findById(params.transactionId).lean()) as any;
    const doctorId = tx?.metadata?.doctorId;
    if (!tx || tx.status !== 'success' || !doctorId || !mongoose.Types.ObjectId.isValid(String(doctorId))) return;
    const gross = money(tx.amount);
    if (gross <= 0) return;

    const settings = await getFinanceSettings();
    const commission = money((gross * settings.commissionPercent) / 100);
    const net = money(gross - commission);
    const wallet = await walletForPractitioner(String(doctorId));

    try {
      await WalletTransaction.create({
        walletId: String(wallet._id),
        ownerId: String(doctorId),
        type: 'earning',
        status: 'held',
        currency: tx.currency,
        gross, commission, commissionPercent: settings.commissionPercent, amount: net,
        appointmentId: params.appointmentId,
        sessionId: params.sessionId,
        patientId: tx.userId,
        paystackReference: tx.reference,
        note: `Consultation payment ${tx.reference}`,
      });
    } catch (e: any) {
      if (e?.code === 11000) return; // already credited
      throw e;
    }
    await Wallet.updateOne(
      { _id: wallet._id },
      { $inc: { heldBalance: net, lifetimeEarnings: net, lifetimeCommission: commission } }
    );
  } catch (e) {
    // Never block a booking because of bookkeeping; the admin summary shows missing earnings.
    console.error('recordConsultationEarning failed', e);
  }
}

/** Doctor ended the consultation: start the safety window (only if it really took place). */
export async function markConsultationCompleted(sessionId: string) {
  const session = (await TelemedicineSession.findById(sessionId).lean()) as any;
  if (!session?.appointmentId) return;
  const start = session.actualStartTime ? new Date(session.actualStartTime).getTime() : 0;
  const end = session.actualEndTime ? new Date(session.actualEndTime).getTime() : Date.now();
  const minutes = start ? (end - start) / 60000 : 0;
  const entry = (await WalletTransaction.findOne({ type: 'earning', appointmentId: String(session.appointmentId) }).lean()) as any;
  if (!entry || entry.status !== 'held' || entry.completedAt) return;
  const settings = await getFinanceSettings();
  // A consultation under 3 minutes is not auto-released; an admin has to look at it.
  if (minutes < 3) {
    await WalletTransaction.updateOne({ _id: entry._id }, { $set: { completedAt: new Date(), note: `${entry.note || ''} | Very short session (${minutes.toFixed(1)} min): needs admin release`.trim() } });
    return;
  }
  await WalletTransaction.updateOne(
    { _id: entry._id },
    { $set: { completedAt: new Date(), releaseAt: new Date(Date.now() + settings.holdHours * 3600_000) } }
  );
}

/** Moves earnings whose safety window has passed (and that nobody disputed) from held to available. */
export async function releaseDueEarnings(ownerId: string) {
  const due = (await WalletTransaction.find({
    ownerId: String(ownerId), type: 'earning', status: 'held', disputed: { $ne: true }, releaseAt: { $lte: new Date() },
  }).lean()) as any[];
  for (const e of due) {
    const flipped = await WalletTransaction.findOneAndUpdate({ _id: e._id, status: 'held' }, { $set: { status: 'available' } });
    if (flipped) await Wallet.updateOne({ ownerId: String(ownerId) }, { $inc: { heldBalance: -e.amount, availableBalance: e.amount } });
  }
}

export async function releaseEarningNow(appointmentId: string, adminId: string) {
  const e = (await WalletTransaction.findOneAndUpdate(
    { type: 'earning', appointmentId, status: 'held' },
    { $set: { status: 'available', disputed: false, note: `Released by admin ${adminId}` } }
  )) as any;
  if (e) await Wallet.updateOne({ ownerId: e.ownerId }, { $inc: { heldBalance: -e.amount, availableBalance: e.amount } });
  return Boolean(e);
}

export async function setEarningDisputed(appointmentId: string, disputed: boolean) {
  await WalletTransaction.updateOne(
    { type: 'earning', appointmentId, status: 'held' },
    { $set: { disputed, ...(disputed ? {} : { releaseAt: new Date() }) } }
  );
}

/** Takes the practitioner's share back out after a refund (from held first, else from available). */
async function reverseEarning(appointmentId: string, fraction: number) {
  const e = (await WalletTransaction.findOne({ type: 'earning', appointmentId, status: { $in: ['held', 'available'] } }).lean()) as any;
  if (!e) return;
  const take = money(e.amount * fraction);
  const commissionBack = money(e.commission * fraction);
  const field = e.status === 'held' ? 'heldBalance' : 'availableBalance';
  await Wallet.updateOne({ ownerId: e.ownerId }, { $inc: { [field]: -take, lifetimeEarnings: -take, lifetimeCommission: -commissionBack } });
  await WalletTransaction.create({
    walletId: e.walletId, ownerId: e.ownerId, type: 'refund_reversal', status: 'settled', currency: e.currency,
    amount: -take, gross: -money(e.gross * fraction), commission: -commissionBack, appointmentId, patientId: e.patientId,
    note: `Patient refund (${Math.round(fraction * 100)}%)`,
  });
  if (fraction >= 0.999) await WalletTransaction.updateOne({ _id: e._id }, { $set: { status: 'reversed' } });
}

/** Returns the money to the patient through Paystack (same card / mobile money they paid with). */
export async function processRefund(refundId: string, opts: { amount?: number; adminId?: string; note?: string; auto?: boolean }) {
  const r = (await RefundRequest.findById(refundId)) as any;
  if (!r || ['processed', 'manual_required', 'denied'].includes(r.status)) return r;

  const amount = money(Math.min(r.amountPaid, opts.amount ?? r.amountPaid));
  if (amount <= 0) throw new Error('Refund amount must be above zero');

  let providerStatus = 'manual_required';
  let providerResponse = '';
  const paystack = getPaystackSettings((await Settings.findOne().lean()) as any);
  if (paystack.secretKey && r.reference) {
    try {
      const res = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: { Authorization: `Bearer ${paystack.secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: r.reference, amount: toPaystackSubunit(amount), customer_note: 'Qwesi consultation refund', merchant_note: `Refund ${r._id}` }),
      });
      const data = await res.json();
      providerResponse = JSON.stringify(data).slice(0, 500);
      if (res.ok && data?.status) providerStatus = 'processed';
    } catch (e: any) {
      providerResponse = String(e?.message || e);
    }
  }

  r.status = providerStatus; // 'processed' | 'manual_required' (admin refunds in the Paystack dashboard, then marks it done)
  r.refundAmount = amount;
  r.reviewedAt = new Date();
  r.reviewedBy = opts.auto ? 'system (no-show rule)' : opts.adminId;
  if (opts.note) r.adminNote = opts.note;
  r.providerResponse = providerResponse;
  await r.save();

  await reverseEarning(String(r.appointmentId), amount / r.amountPaid);
  await Appointment.updateOne({ _id: r.appointmentId }, { $set: { status: 'cancelled', notes: `Refunded ${r.currency} ${amount} (${r.reason})` } });
  await TelemedicineSession.updateOne({ appointmentId: r.appointmentId, status: { $in: ['scheduled', 'waiting'] } }, { $set: { status: 'cancelled', paymentStatus: 'refunded' } }).catch(() => {});
  return r;
}
