/**
 * Qwesi stores phones as country code + number (233595553746); patients type them locally (0595553746) or with +.
 * Normalise to digits-only international form. DEFAULT_COUNTRY_CODE (default 233, Ghana) is used when the
 * number is local. Anything that already looks international (+..., 00..., or 11+ digits) keeps its own code.
 */
export function normalizePhone(input: unknown, defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '233'): string {
  const raw = String(input ?? '').trim();
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
