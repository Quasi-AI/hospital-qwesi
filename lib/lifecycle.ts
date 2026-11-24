import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Patient from '@/models/Patient';
import Appointment from '@/models/Appointment';
import { sendEmail } from '@/lib/notifications/email-provider';
import { sendWhatsApp } from '@/lib/whatsapp';
import { getEffectiveProviderApprovalStatus } from '@/lib/providerApproval';
import Settings from '@/models/Settings';

/**
 * Scheduled emails (run daily by /api/cron/lifecycle):
 *  1. providers (doctors, herbalists, pharmacies) who have not finished their profile,
 *  2. providers (and the patient) after a missed consultation,
 *  3. patients who have not logged in for a while.
 * Every send is "claimed" with an atomic update first, so two servers running at once never email anyone twice.
 */

const DAY = 24 * 60 * 60 * 1000;
const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const appUrl = () => (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
const realEmail = (e?: string) => (e && !/@phone\.qwesi\.org$/i.test(e) ? e : '');
const BATCH = num(process.env.LIFECYCLE_BATCH, 100);

async function clinic(): Promise<string> {
  try {
    const s = (await Settings.findOne({}).select('systemTitle').lean()) as { systemTitle?: string } | null;
    return s?.systemTitle || 'Qwesi Virtual Hospital';
  } catch { return 'Qwesi Virtual Hospital'; }
}

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function layout(brand: string, heading: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f6f4ff;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e9e3ff">
<div style="background:linear-gradient(135deg,#5b3df5,#8b5cf6);color:#fff;padding:20px 24px;font-size:18px;font-weight:700">${esc(brand)}</div>
<div style="padding:24px;color:#1f1147;font-size:15px;line-height:1.55"><h2 style="margin:0 0 12px;font-size:20px">${esc(heading)}</h2>${bodyHtml}
${cta ? `<p style="margin:24px 0 8px"><a href="${esc(cta.href)}" style="background:#5b3df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>` : ''}
</div><div style="padding:14px 24px;background:#faf9ff;color:#7a6fa8;font-size:12px">You are receiving this because you have an account with ${esc(brand)}.</div></div></div>`;
}

const textOf = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<br\s*\/?>/g, '\n').replace(/<\/p>/g, '\n\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();

async function mail(to: string, subject: string, html: string) {
  const r = await sendEmail({ to, subject, html, text: textOf(html) });
  if (!r.success) console.warn('[lifecycle] email failed for', to, r.error);
  return r.success;
}

type Counts = { checked: number; sent: number; failed: number };

/** 1. Providers who have not completed their profile. First after 1 day, then every 3 days, at most 8 times. */
export async function remindIncompleteProfiles(): Promise<Counts> {
  await dbConnect();
  const brand = await clinic();
  const out: Counts = { checked: 0, sent: 0, failed: 0 };
  const now = Date.now();
  const every = num(process.env.PROFILE_REMINDER_EVERY_DAYS, 3) * DAY;
  const maxTimes = num(process.env.PROFILE_REMINDER_MAX, 8);
  const candidates = await User.find({
    role: { $in: ['doctor', 'pharmacy'] },
    approvalStatus: 'pending_profile',
    email: { $exists: true, $ne: '' },
    createdAt: { $lte: new Date(now - DAY) },
    $or: [{ profileReminderSentAt: { $exists: false } }, { profileReminderSentAt: null }, { profileReminderSentAt: { $lte: new Date(now - every) } }],
    profileReminderCount: { $not: { $gte: maxTimes } },
  }).select('name email role image hasImage licenseNumber licenseCertificate.fileName consultationFee practitionerType profileReminderSentAt').limit(BATCH).lean();

  for (const u of candidates as any[]) {
    out.checked++;
    if (getEffectiveProviderApprovalStatus(u) !== 'pending_profile') continue; // actually complete
    const claimed = await User.findOneAndUpdate(
      { _id: u._id, $or: [{ profileReminderSentAt: { $exists: false } }, { profileReminderSentAt: null }, { profileReminderSentAt: { $lte: new Date(now - every) } }] },
      { $set: { profileReminderSentAt: new Date() }, $inc: { profileReminderCount: 1 } },
    ).select('profileReminderSentAt profileReminderCount').lean() as any;
    if (!claimed) continue;
    const missing: string[] = [];
    if (!(u.image || u.hasImage)) missing.push('a profile photo');
    if (!u.licenseNumber?.trim()) missing.push('your licence number');
    if (!(u.licenseCertificate?.fileName)) missing.push('your licence certificate');
    const kind = u.role === 'pharmacy' ? 'pharmacy' : u.practitionerType === 'herbalist' ? 'herbalist' : 'doctor';
    const free = u.role === 'doctor' && !(Number(u.consultationFee) > 0);
    const body = `<p>Hello ${esc(u.name || '')},</p>
<p>Your ${kind} profile on ${esc(brand)} is not finished yet, so it cannot be verified${kind === 'pharmacy' ? '' : ' and patients cannot book you with full confidence'}.</p>
${missing.length ? `<p>Still needed: <strong>${missing.map(esc).join(', ')}</strong>.</p>` : ''}
${free ? '<p><strong>Important:</strong> your consultation fee is currently set to free. Profiles that are unfinished <em>and</em> free are hidden from patients, so you will not receive bookings until you complete your profile (or set a fee).</p>' : ''}
<p>It only takes a few minutes.</p>`;
    const ok = await mail(u.email, 'Action needed: complete your profile', layout(brand, 'Please complete your profile', body, { label: 'Complete my profile', href: `${appUrl()}/profile` }));
    if (ok) out.sent++; else {
      out.failed++; // not delivered (e.g. email not configured): put it back so it is retried on the next run
      await User.updateOne({ _id: u._id }, claimed.profileReminderSentAt ? { $set: { profileReminderSentAt: claimed.profileReminderSentAt, profileReminderCount: claimed.profileReminderCount || 0 } } : { $unset: { profileReminderSentAt: 1 }, $set: { profileReminderCount: claimed.profileReminderCount || 0 } });
    }
  }
  return out;
}

/** 2. Missed consultations: still "scheduled/confirmed" 45+ minutes after the start time (within the last 14 days). */
export async function noticeMissedConsultations(): Promise<Counts> {
  await dbConnect();
  const brand = await clinic();
  const out: Counts = { checked: 0, sent: 0, failed: 0 };
  const now = Date.now();
  const grace = num(process.env.MISSED_GRACE_MINUTES, 45) * 60 * 1000;
  const rows = await Appointment.find({
    status: { $in: ['scheduled', 'confirmed'] },
    missedNoticeSentAt: { $exists: false },
    appointmentDate: { $gte: new Date(now - 15 * DAY), $lte: new Date(now + DAY) },
  }).sort({ appointmentDate: 1 }).limit(BATCH * 3).lean();

  for (const a of rows as any[]) {
    const day = new Date(a.appointmentDate).toISOString().slice(0, 10);
    const startsAt = new Date(`${day}T${a.appointmentTime}`);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() + grace > now) continue;
    out.checked++;
    const claimed = await Appointment.findOneAndUpdate({ _id: a._id, missedNoticeSentAt: { $exists: false } }, { $set: { missedNoticeSentAt: new Date() } }).select('_id').lean();
    if (!claimed) continue;
    const when = `${day} at ${a.appointmentTime}`;
    let delivered = 0, tried = 0;
    const provider = a.doctorId ? ((await User.findById(a.doctorId).select('name email role').lean()) as any) : null;
    if (provider?.email) {
      const body = `<p>Hello ${esc(provider.name || '')},</p><p>A consultation with <strong>${esc(a.patientName || 'a patient')}</strong> scheduled for <strong>${esc(when)}</strong> was not attended.</p>
<p>Please keep your availability up to date and join consultations on time, because patients pay for these slots. If something went wrong, you can reschedule it from your dashboard.</p>`;
      tried++; (await mail(provider.email, `Missed consultation on ${day}`, layout(brand, 'You missed a consultation', body, { label: 'Open my appointments', href: `${appUrl()}/appointments` }))) ? (out.sent++, delivered++) : out.failed++;
    }
    if (a.patientPhone) {
      tried++; (await sendWhatsApp(a.patientPhone, `Hello ${a.patientName || ''}, we are sorry: your consultation with ${a.doctorName || 'your doctor'} on ${when} did not take place. You can book a new time here: ${appUrl()}/patient-portal/doctors`)) ? (out.sent++, delivered++) : out.failed++;
    }
    if (realEmail(a.patientEmail)) {
      const body = `<p>Hello ${esc(a.patientName || '')},</p><p>We are sorry: your consultation with <strong>${esc(a.doctorName || 'your doctor')}</strong> on <strong>${esc(when)}</strong> did not take place.</p>
<p>You can book a new time, or choose another practitioner, and we will make sure it is looked after.</p>`;
      tried++; (await mail(a.patientEmail, 'Sorry we missed you - let us rebook', layout(brand, 'Your consultation did not take place', body, { label: 'Book again', href: `${appUrl()}/patient-portal/doctors` }))) ? (out.sent++, delivered++) : out.failed++;
    }
    if (tried && !delivered) await Appointment.updateOne({ _id: a._id }, { $unset: { missedNoticeSentAt: 1 } }); // retry next run
  }
  return out;
}

/** 3. Patients who have not logged in for 14+ days: a friendly check-in, then at most once every 30 days. */
export async function checkInOnInactivePatients(): Promise<Counts> {
  await dbConnect();
  const brand = await clinic();
  const out: Counts = { checked: 0, sent: 0, failed: 0 };
  const now = Date.now();
  const inactive = new Date(now - num(process.env.PATIENT_CHECKIN_AFTER_DAYS, 14) * DAY);
  const resend = new Date(now - num(process.env.PATIENT_CHECKIN_EVERY_DAYS, 30) * DAY);
  const rows = await Patient.find({
    $and: [
      { $or: [{ email: { $exists: true, $nin: ['', null], $not: /@phone\.qwesi\.org$/i } }, { phone: { $exists: true, $nin: ['', null] } }] },
      { $or: [{ lastLoginAt: { $lte: inactive } }, { lastLoginAt: { $exists: false }, createdAt: { $lte: inactive } }] },
      { $or: [{ checkInEmailSentAt: { $exists: false } }, { checkInEmailSentAt: null }, { checkInEmailSentAt: { $lte: resend } }] },
    ],
  }).select('name email phone').limit(BATCH).lean();

  for (const p of rows as any[]) {
    out.checked++;
    const claimed = await Patient.findOneAndUpdate(
      { _id: p._id, $or: [{ checkInEmailSentAt: { $exists: false } }, { checkInEmailSentAt: null }, { checkInEmailSentAt: { $lte: resend } }] },
      { $set: { checkInEmailSentAt: new Date() } },
    ).select('checkInEmailSentAt').lean() as any;
    if (!claimed) continue;
    const first = String(p.name || '').split(' ')[0];
    const body = `<p>Hello ${esc(first)},</p><p>We have not seen you for a little while and wanted to check in: <strong>how are you feeling?</strong></p>
<p>If anything is bothering you, a doctor is available by video, and Qwesi, our AI health assistant, can answer questions any time on WhatsApp. It also helps to keep your medication reminders and health records up to date.</p>`;
    const okMail = realEmail(p.email) ? await mail(p.email, `${first ? first + ', ' : ''}how are you feeling?`, layout(brand, 'Checking in on you', body, { label: 'Open my health portal', href: `${appUrl()}/patient-portal` })) : false;
    const okWa = p.phone ? await sendWhatsApp(p.phone, `Hello ${first}, we have not seen you for a while and wanted to check in: how are you feeling? If anything is bothering you, just reply here and Qwesi will help, or see a doctor by video: ${appUrl()}/patient-portal`) : false;
    (okMail || okWa) ? out.sent++ : (out.failed++, await Patient.updateOne({ _id: p._id }, claimed.checkInEmailSentAt ? { $set: { checkInEmailSentAt: claimed.checkInEmailSentAt } } : { $unset: { checkInEmailSentAt: 1 } }));
  }
  return out;
}

export async function runLifecycleJobs() {
  const results: Record<string, Counts | { error: string }> = {};
  for (const [name, job] of [['incompleteProfiles', remindIncompleteProfiles], ['missedConsultations', noticeMissedConsultations], ['patientCheckIns', checkInOnInactivePatients]] as const) {
    try { results[name] = await job(); } catch (e: any) { console.error(`[lifecycle] ${name} failed:`, e); results[name] = { error: e?.message || 'failed' }; }
  }
  return results;
}
