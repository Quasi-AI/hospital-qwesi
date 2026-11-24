import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Patient from '@/models/Patient';
import { findPatientByPhone, isPlaceholderEmail, siteUrl } from '@/lib/bridge';
import { signResetToken } from '@/lib/passwordReset';
import { sendEmail } from '@/lib/notifications/email-provider';
import { sendWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const recent = new Map<string, number>(); // best-effort throttle per account (per server instance)
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// POST { identifier }  (email or phone) -> always the same answer, so nobody can probe which accounts exist.
export async function POST(request: NextRequest) {
  const generic = NextResponse.json({ ok: true });
  try {
    const { identifier } = await request.json();
    const id = String(identifier || '').trim().toLowerCase();
    if (!id || id.length > 200) return generic;
    await dbConnect();

    let account: any = null;
    let kind: 'user' | 'patient' = 'user';
    if (id.includes('@')) {
      account = await User.findOne({ email: id });
      if (!account) { account = await Patient.findOne({ email: id }); kind = 'patient'; }
    } else {
      account = await findPatientByPhone(id);
      kind = 'patient';
      if (!account && id.replace(/\D/g, '').length >= 9) {
        account = await User.findOne({ phone: { $regex: `${id.replace(/\D/g, '').slice(-9)}$` } });
        kind = 'user';
      }
    }
    if (!account) return generic;

    const key = String(account._id);
    if (Date.now() - (recent.get(key) || 0) < 60_000) return generic;
    recent.set(key, Date.now());

    const link = `${siteUrl(request)}/reset-password?token=${signResetToken(kind, key, account.password)}`;
    const name = String(account.name || '').split(' ')[0];
    const realEmail = account.email && !isPlaceholderEmail(account.email) ? account.email : '';
    if (realEmail) {
      await sendEmail({
        to: realEmail,
        subject: 'Reset your Qwesi password',
        text: `Hello ${name},\n\nUse this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, ignore this message — your password stays the same.`,
        html: `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;padding:20px"><h2 style="color:#4c30be;margin:0 0 12px">Reset your password</h2><p>Hello ${esc(name)},</p><p>Click the button to choose a new password. The link works for 1 hour and only once.</p><p><a href="${link}" style="display:inline-block;background:#6949ed;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Choose a new password</a></p><p style="color:#6b7280;font-size:13px">If you did not ask for this, ignore this email — your password stays the same.</p></div>`,
      });
    }
    if (kind === 'patient' && account.phone) {
      await sendWhatsApp(account.phone, `Hello ${name}, use this link to choose a new Qwesi password (valid for 1 hour): ${link}\nIf you did not ask for this, ignore this message.`);
    }
  } catch (e) {
    console.error('forgot-password', e);
  }
  return generic;
}
