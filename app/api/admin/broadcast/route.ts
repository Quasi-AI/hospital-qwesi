import { NextRequest, NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import EmailBroadcast from '@/models/EmailBroadcast';
import { sendEmail } from '@/lib/notifications/email-provider';
import { GROUPS, groupCounts, resolveRecipients, renderMessage, renderSubject, searchPeople } from '@/lib/broadcast';

export const maxDuration = 300;
const MAX_RECIPIENTS = 5000;
const CONCURRENCY = 8;

async function adminSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin' ? session : null;
}

function wrap(bodyHtml: string, subject: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:600px;margin:0 auto;padding:24px 12px">
 <div style="background:#0f766e;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700">Qwesi Virtual Hospital</div>
 <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;line-height:1.6;font-size:15px">
  <h2 style="margin:0 0 16px;font-size:20px">${subject.replace(/</g, '&lt;')}</h2>
  ${bodyHtml}
 </div>
 <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:16px">You are receiving this message as a Qwesi Virtual Hospital member.</p>
</div></body></html>`;
}

/**
 * GET                      -> group counts + recent broadcasts
 * GET ?q=ann&kind=all      -> people search for picking individuals
 */
export async function GET(request: NextRequest) {
  if (!(await adminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  await dbConnect();
  const sp = new URL(request.url).searchParams;
  const q = (sp.get('q') || '').trim();
  if (q.length >= 2) return NextResponse.json({ people: await searchPeople(q, sp.get('kind') || 'all') });
  const [counts, history] = await Promise.all([
    groupCounts(),
    EmailBroadcast.find().sort({ createdAt: -1 }).limit(20).select('-failures').lean(),
  ]);
  return NextResponse.json({ groups: GROUPS, counts, history });
}

/** POST { subject, message, groups: string[], specific: {kind,id}[], test?: boolean, dryRun?: boolean } */
export async function POST(request: NextRequest) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const subject = String(body.subject || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 20000);
  const groups: string[] = Array.isArray(body.groups) ? body.groups.filter((g: unknown) => GROUPS.some((x) => x.id === g)) : [];
  const specific: { kind: string; id: string }[] = Array.isArray(body.specific)
    ? body.specific.slice(0, 2000).map((s: any) => ({ kind: String(s?.kind || ''), id: String(s?.id || '') }))
    : [];

  await dbConnect();

  if (body.dryRun) {
    const recipients = await resolveRecipients(groups, specific);
    return NextResponse.json({ total: recipients.length });
  }
  if (!subject || !message) return NextResponse.json({ error: 'Add a subject and a message' }, { status: 400 });

  // Send a single preview to the admin's own address
  if (body.test) {
    const to = session.user?.email;
    if (!to) return NextResponse.json({ error: 'Your account has no email address' }, { status: 400 });
    const name = session.user?.name || 'there';
    const r = await sendEmail({ to, subject: `[Test] ${renderSubject(subject, name)}`, html: wrap(renderMessage(message, name), renderSubject(subject, name)) });
    return r.success ? NextResponse.json({ ok: true, sentTo: to }) : NextResponse.json({ error: r.error || 'Could not send the test' }, { status: 502 });
  }

  if (!groups.length && !specific.length) return NextResponse.json({ error: 'Choose who should receive it' }, { status: 400 });
  const recipients = await resolveRecipients(groups, specific);
  if (!recipients.length) return NextResponse.json({ error: 'No recipients with a valid email address' }, { status: 400 });
  if (recipients.length > MAX_RECIPIENTS) return NextResponse.json({ error: `Too many recipients (${recipients.length}). Send to smaller groups, max ${MAX_RECIPIENTS} at a time.` }, { status: 400 });

  const doc: any = await EmailBroadcast.create({
    subject, message, groups,
    specific: recipients.filter((r) => specific.some((s) => s.id === r.id)).slice(0, 200).map((r) => ({ kind: r.kind, id: r.id, name: r.name, email: r.email })),
    total: recipients.length, status: 'sending',
    createdBy: session.user?.id, createdByName: session.user?.name,
  });

  // Send after the response so the admin isn't left waiting; progress is saved on the broadcast record.
  after(async () => {
    let sent = 0, failed = 0;
    const failures: { email: string; error: string }[] = [];
    let cursor = 0, lastSave = Date.now();
    const save = () => EmailBroadcast.updateOne({ _id: doc._id }, { $set: { sent, failed } }).catch(() => {});
    const worker = async () => {
      while (cursor < recipients.length) {
        const r = recipients[cursor++];
        try {
          const subj = renderSubject(subject, r.name);
          const res = await sendEmail({ to: r.email, subject: subj, html: wrap(renderMessage(message, r.name), subj) });
          if (res.success) sent++; else { failed++; if (failures.length < 50) failures.push({ email: r.email, error: String(res.error || 'failed').slice(0, 200) }); }
        } catch (e: any) { failed++; if (failures.length < 50) failures.push({ email: r.email, error: String(e?.message || 'failed').slice(0, 200) }); }
        if (Date.now() - lastSave > 3000) { lastSave = Date.now(); await save(); }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    await EmailBroadcast.updateOne({ _id: doc._id }, { $set: { sent, failed, failures, status: 'done' } });
  });

  return NextResponse.json({ id: String(doc._id), total: recipients.length });
}
