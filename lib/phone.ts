/**
 * Qwesi stores phones as country code + number (233595553746); patients type them locally (0595553746) or with +.
 * Normalise to digits-only international form. DEFAULT_COUNTRY_CODE (default 233, Ghana) is used when the
 * number is local. Anything that already looks international (+..., 00..., or 11+ digits) keeps its own code.
 */
export function normalizePhone(input: unknown, defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '233'): string {
  const raw = String(input ?? '').trim();
  const canon = toE164(raw, 'GH');
  if (canon) return canon.slice(1);
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (raw.startsWith('+')) return d;
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return defaultCountryCode + d.replace(/^0+/, '');
  if (d.length >= 11) return d;                       // already has a country code
  return defaultCountryCode + d;                      // national number typed without the leading 0
}

/** Last 9 digits: the part that stays the same however the number was typed. */
export const phoneTail = (input: unknown) => String(input ?? '').replace(/\D/g, '').slice(-9);

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/**
 * Canonical international form with "+", e.g. "+233595553746".
 * Understands local numbers (0595553746), numbers with a stray trunk zero after the country code
 * (+2330595553746), spaces, dashes and a missing "+". Returns '' when it cannot be a real number.
 */
export function toE164(input: unknown, defaultCountry: string = process.env.DEFAULT_COUNTRY || 'GH'): string {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[^\d+]/g, '');
  const candidates = [cleaned, cleaned.startsWith('00') ? `+${cleaned.slice(2)}` : '', /^\d{11,}$/.test(cleaned) ? `+${cleaned}` : ''].filter(Boolean);
  for (const c of candidates) {
    const p = parsePhoneNumberFromString(c, defaultCountry as CountryCode);
    if (p?.isValid()) return p.number;
  }
  return '';
}

/**
 * One phone number = one Qwesi account (credits are tied to it). Returns an error message if another patient or
 * user already has this number, otherwise null. `exceptEmail` is the account being saved (its own number is fine).
 */
export async function phoneTakenMessage(phone: string, exceptEmail?: string): Promise<string | null> {
  const tail = phoneTail(phone);
  if (tail.length < 9) return null;
  const [{ default: Patient }, { default: User }] = await Promise.all([import('@/models/Patient'), import('@/models/User')]);
  const rx = new RegExp(`${tail}\\s*$`);
  const except = exceptEmail ? { email: { $ne: exceptEmail.toLowerCase() } } : {};
  const [p, u] = await Promise.all([
    Patient.exists({ ...except, phone: { $regex: rx } }),
    User.exists({ ...except, phone: { $regex: rx } }),
  ]);
  return p || u ? 'This phone number is already registered to another account. Each phone number can only be used once.' : null;
}
