import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Patient from '@/models/Patient';
import TelemedicineSession from '@/models/TelemedicineSession';

/**
 * Who may see which patient.
 *  - admin / staff / nurse : every patient
 *  - doctor / herbalist    : only patients assigned to them (an appointment or consultation with them)
 *  - patient               : only themselves
 *  - everyone else (pharmacy, logged out): none
 */
export type PatientScope =
  | { kind: 'all' }
  | { kind: 'ids'; ids: mongoose.Types.ObjectId[] }
  | { kind: 'self'; email: string }
  | { kind: 'none' };

export type SessionUser = { id?: string; email?: string | null; name?: string | null; role?: string };

const oid = (v: unknown) => (v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null);

/** Patients assigned to one doctor: anyone with a (non-cancelled) appointment or a consultation with them. */
export async function getAssignedPatientIds(doctor: SessionUser): Promise<mongoose.Types.ObjectId[]> {
  const doctorOid = oid(doctor.id);
  const doctorMatch: Record<string, unknown>[] = [];
  if (doctorOid) doctorMatch.push({ doctorId: doctorOid });
  if (doctor.email) doctorMatch.push({ doctorEmail: String(doctor.email).toLowerCase() });
  if (!doctorMatch.length) return [];

  const [appointments, sessionPatientIds] = await Promise.all([
    Appointment.find({ $or: doctorMatch, status: { $ne: 'cancelled' } }).select('patientId patientEmail').lean(),
    doctorOid ? TelemedicineSession.distinct('patientId', { doctorId: doctorOid }) : Promise.resolve([]),
  ]);

  const ids = new Map<string, mongoose.Types.ObjectId>();
  const emails = new Set<string>();
  for (const a of appointments as { patientId?: unknown; patientEmail?: string }[]) {
    const id = oid(a.patientId);
    if (id) ids.set(String(id), id);
    if (a.patientEmail) emails.add(a.patientEmail.toLowerCase());
  }
  for (const p of sessionPatientIds) {
    const id = oid(p);
    if (id) ids.set(String(id), id);
  }
  if (emails.size) {
    const byEmail = await Patient.find({ email: { $in: [...emails] } }).select('_id').lean();
    for (const p of byEmail) ids.set(String(p._id), p._id as mongoose.Types.ObjectId);
  }
  return [...ids.values()];
}

export async function getPatientScope(): Promise<{ user: SessionUser | null; scope: PatientScope }> {
  const session = await getServerSession(authOptions);
  const user = (session?.user as SessionUser | undefined) || null;
  if (!user) return { user: null, scope: { kind: 'none' } };
  await dbConnect();
  switch (user.role) {
    case 'admin':
    case 'staff':
    case 'nurse':
      return { user, scope: { kind: 'all' } };
    case 'doctor':
      return { user, scope: { kind: 'ids', ids: await getAssignedPatientIds(user) } };
    case 'patient':
      return { user, scope: { kind: 'self', email: String(user.email || '').toLowerCase() } };
    default:
      return { user, scope: { kind: 'none' } };
  }
}

/** Mongo filter that restricts a Patient query to what the scope allows. */
export function patientFilterForScope(scope: PatientScope): Record<string, unknown> {
  const live = { deletedAt: { $exists: false } };
  switch (scope.kind) {
    case 'all': return live;
    case 'ids': return { ...live, _id: { $in: scope.ids } };
    case 'self': return { ...live, email: scope.email };
    default: return { _id: { $in: [] } };
  }
}

export function canSeePatient(scope: PatientScope, patient: { _id: unknown; email?: string }): boolean {
  switch (scope.kind) {
    case 'all': return true;
    case 'ids': return scope.ids.some((id) => String(id) === String(patient._id));
    case 'self': return String(patient.email || '').toLowerCase() === scope.email;
    default: return false;
  }
}

export const unauthorized = () => NextResponse.json({ error: 'Please log in' }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: 'You do not have access to this patient' }, { status: 403 });

/**
 * Gate for records that belong to a patient (invoices, lab orders, ...).
 * Returns an error response, or the extra Mongo filter to AND onto the query.
 */
export async function scopeRecordsByPatient(
  field = 'patientId',
  opts: { allowSelfByEmailField?: string } = {}
): Promise<NextResponse | { filter: Record<string, unknown> }> {
  const { user, scope } = await getPatientScope();
  if (!user) return unauthorized();
  if (scope.kind === 'all') return { filter: {} };
  if (scope.kind === 'ids') {
    return { filter: { [field]: { $in: [...scope.ids, ...scope.ids.map(String)] } } };
  }
  if (scope.kind === 'self' && opts.allowSelfByEmailField) {
    return { filter: { [opts.allowSelfByEmailField]: scope.email } };
  }
  return forbidden();
}
