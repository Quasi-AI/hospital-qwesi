import User from '@/models/User';
import Patient from '@/models/Patient';

export const GROUPS = [
  { id: 'patients', label: 'All patients' },
  { id: 'doctors', label: 'All doctors' },
  { id: 'herbalists', label: 'All herbalists' },
  { id: 'pharmacists', label: 'All pharmacists' },
  { id: 'staff', label: 'Staff & nurses' },
] as const;
export type GroupId = (typeof GROUPS)[number]['id'];

const ALIVE = { deletedAt: { $exists: false } };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function userFilterFor(group: GroupId): Record<string, unknown> | null {
  switch (group) {
    case 'doctors': return { ...ALIVE, role: 'doctor', practitionerType: { $ne: 'herbalist' } };
    case 'herbalists': return { ...ALIVE, role: 'doctor', practitionerType: 'herbalist' };
    case 'pharmacists': return { ...ALIVE, role: 'pharmacy' };
    case 'staff': return { ...ALIVE, role: { $in: ['staff', 'nurse'] } };
    default: return null;
  }
}

export type Recipient = { kind: string; id: string; name: string; email: string };

export async function groupCounts(): Promise<Record<GroupId, number>> {
  const out = {} as Record<GroupId, number>;
  await Promise.all(
    GROUPS.map(async (g) => {
      out[g.id] = g.id === 'patients'
        ? await Patient.countDocuments({ ...ALIVE, email: { $exists: true, $ne: '' } })
        : await User.countDocuments({ ...userFilterFor(g.id)!, email: { $exists: true, $ne: '' } });
    })
  );
  return out;
}

/** Search people to pick individually. */
export async function searchPeople(q: string, kind: string, limit = 15): Promise<Recipient[]> {
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const match = { $or: [{ name: rx }, { email: rx }] };
  const out: Recipient[] = [];
  if (kind === 'all' || kind === 'patients') {
    const rows: any[] = await Patient.find({ ...ALIVE, ...match }).select('name email').limit(limit).lean();
    out.push(...rows.map((r) => ({ kind: 'patients', id: String(r._id), name: r.name, email: r.email })));
  }
  const userGroups: GroupId[] = kind === 'all' ? ['doctors', 'herbalists', 'pharmacists', 'staff'] : (['doctors', 'herbalists', 'pharmacists', 'staff'] as GroupId[]).filter((g) => g === kind);
  for (const g of userGroups) {
    const rows: any[] = await User.find({ ...userFilterFor(g)!, ...match }).select('name email').limit(limit).lean();
    out.push(...rows.map((r) => ({ kind: g, id: String(r._id), name: r.name, email: r.email })));
  }
  return out.filter((r) => EMAIL_RE.test(r.email || '')).slice(0, limit * 2);
}

/** Everyone the broadcast will go to (groups + individually picked people), de-duplicated by email. */
export async function resolveRecipients(groups: string[], specific: { kind: string; id: string }[]): Promise<Recipient[]> {
  const map = new Map<string, Recipient>();
  const add = (r: Recipient) => {
    const email = String(r.email || '').trim().toLowerCase();
    if (EMAIL_RE.test(email) && !map.has(email)) map.set(email, { ...r, email });
  };
  for (const g of groups as GroupId[]) {
    if (g === 'patients') {
      const rows: any[] = await Patient.find({ ...ALIVE, email: { $exists: true, $ne: '' } }).select('name email').lean();
      rows.forEach((r) => add({ kind: 'patients', id: String(r._id), name: r.name, email: r.email }));
    } else if (userFilterFor(g)) {
      const rows: any[] = await User.find({ ...userFilterFor(g)!, email: { $exists: true, $ne: '' } }).select('name email').lean();
      rows.forEach((r) => add({ kind: g, id: String(r._id), name: r.name, email: r.email }));
    }
  }
  const patientIds = specific.filter((s) => s.kind === 'patients').map((s) => s.id);
  const userIds = specific.filter((s) => s.kind !== 'patients').map((s) => s.id);
  if (patientIds.length) {
    const rows: any[] = await Patient.find({ _id: { $in: patientIds }, ...ALIVE }).select('name email').lean();
    rows.forEach((r) => add({ kind: 'patients', id: String(r._id), name: r.name, email: r.email }));
  }
  if (userIds.length) {
    const rows: any[] = await User.find({ _id: { $in: userIds }, ...ALIVE }).select('name email role practitionerType').lean();
    rows.forEach((r) => add({ kind: r.role === 'pharmacy' ? 'pharmacists' : r.practitionerType === 'herbalist' ? 'herbalists' : r.role === 'doctor' ? 'doctors' : 'staff', id: String(r._id), name: r.name, email: r.email }));
  }
  return [...map.values()];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plain text from the admin -> safe HTML. {{name}} becomes the person's first name; blank line = new paragraph. */
export function renderMessage(message: string, name: string) {
  const first = esc((name || '').replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim().split(/\s+/)[0] || 'there');
  return message
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\{\{\s*name\s*\}\}/gi, first).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
export const renderSubject = (subject: string, name: string) =>
  subject.replace(/\{\{\s*name\s*\}\}/gi, (name || '').replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim().split(/\s+/)[0] || 'there');
