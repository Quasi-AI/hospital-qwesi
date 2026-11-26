import Patient from '@/models/Patient';

/**
 * Every id a signed-in person's notifications can be filed under. Patients sign in with one id but
 * direct messages are addressed to their patient record, so both must count.
 */
export async function myRecipientIds(session: any): Promise<string[]> {
  const ids = new Set<string>();
  if (session?.user?.id) ids.add(String(session.user.id));
  if (session?.user?.role === 'patient' && session.user.email) {
    const p: any = await Patient.findOne({ email: session.user.email }).select('_id').lean();
    if (p?._id) ids.add(String(p._id));
  }
  return [...ids];
}
