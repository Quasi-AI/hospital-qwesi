import mongoose from 'mongoose';
import User from '@/models/User';
import Patient from '@/models/Patient';
import PatientAssistantChat from '@/models/PatientAssistantChat';

export type AccountType = 'user' | 'patient';
export const PROTECTED_EMAILS = new Set(['admin@qwesi.org']);

const model = (type: AccountType): any => (type === 'patient' ? Patient : User);

/**
 * Soft delete = archive. The account disappears from every list and can no longer sign in, and its email and
 * phone number are released (the originals are kept on the record) so the person can register again.
 * Appointments, payments and notes stay untouched. It can be restored while the original email is still free.
 */
export async function softDeleteAccount(type: AccountType, id: string, adminId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false as const, status: 400, error: 'Invalid id' };
  const doc: any = await model(type).findById(id);
  if (!doc) return { ok: false as const, status: 404, error: 'Account not found' };
  if (String(doc._id) === adminId) return { ok: false as const, status: 400, error: 'You cannot delete your own account' };
  if (type === 'user' && doc.role === 'admin') return { ok: false as const, status: 400, error: 'Admin accounts cannot be deleted here' };
  if (PROTECTED_EMAILS.has(String(doc.email).toLowerCase())) return { ok: false as const, status: 400, error: 'This account is protected' };
  if (doc.deletedAt) return { ok: true as const };

  const stamp = Date.now();
  const update: any = {
    deletedAt: new Date(),
    deletedBy: adminId,
    originalEmail: doc.email,
    email: `deleted+${doc._id}.${stamp}@deleted.invalid`,
  };
  if (doc.phone) {
    update.originalPhone = doc.phone;
    update.phone = `deleted-${stamp}-${doc.phone}`;
  }
  await model(type).updateOne({ _id: doc._id }, { $set: update });
  return { ok: true as const };
}

export async function restoreAccount(type: AccountType, id: string) {
  const doc: any = await model(type).findById(id);
  if (!doc || !doc.deletedAt) return { ok: false as const, status: 404, error: 'Archived account not found' };
  const email = String(doc.originalEmail || '').toLowerCase();
  if (!email) return { ok: false as const, status: 400, error: 'Original email is missing' };
  const taken = (await User.exists({ email })) || (await Patient.exists({ email }));
  if (taken) return { ok: false as const, status: 409, error: `Cannot restore: ${email} has registered again. Delete this archived copy instead.` };
  const set: any = { email };
  if (doc.originalPhone) set.phone = doc.originalPhone;
  await model(type).updateOne(
    { _id: doc._id },
    { $set: set, $unset: { deletedAt: '', deletedBy: '', originalEmail: '', originalPhone: '' } }
  );
  return { ok: true as const };
}

/** Permanent delete = the account itself is removed for good (works on active or archived accounts). */
export async function permanentDeleteAccount(type: AccountType, id: string, adminId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false as const, status: 400, error: 'Invalid id' };
  const doc: any = await model(type).findById(id).select('email role');
  if (!doc) return { ok: false as const, status: 404, error: 'Account not found' };
  if (String(doc._id) === adminId) return { ok: false as const, status: 400, error: 'You cannot delete your own account' };
  if (type === 'user' && doc.role === 'admin') return { ok: false as const, status: 400, error: 'Admin accounts cannot be deleted here' };
  if (PROTECTED_EMAILS.has(String(doc.email).toLowerCase())) return { ok: false as const, status: 400, error: 'This account is protected' };
  await model(type).deleteOne({ _id: doc._id });
  if (type === 'patient') await PatientAssistantChat.deleteMany({ patientId: doc._id }).catch(() => {});
  return { ok: true as const };
}

export const NOT_DELETED = { deletedAt: { $exists: false } };
