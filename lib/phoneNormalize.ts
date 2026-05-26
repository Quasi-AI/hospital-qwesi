import parsePhoneNumberFromString, { type CountryCode } from 'libphonenumber-js';

/**
 * Stable key for OTP / patient lookup (10-digit national number for most countries).
 * Pass defaultCountry when numbers may be national format (e.g. 017… for Bangladesh).
 */
export function phoneDigitsForMatch(phone: string, defaultCountry?: CountryCode): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  const nationalKey = (region?: CountryCode) => {
    const p =
      parsePhoneNumberFromString(trimmed, region) ||
      (region ? parsePhoneNumberFromString(trimmed.replace(/\s/g, ''), region) : undefined) ||
      (region ? parsePhoneNumberFromString(trimmed.replace(/\D/g, ''), region) : undefined);
    if (!p?.isValid()) return '';
    const nn = p.nationalNumber;
    if (nn.length >= 10) return nn.slice(-10);
    return nn;
  };

  let key = nationalKey(defaultCountry);
  if (key.length === 10) return key;

  key = nationalKey(undefined);
  if (key.length === 10) return key;

  const d = trimmed.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return d.slice(1);
  if (d.length >= 10) return d.slice(-10);
  return d;
}

/** Mongo regex: digits may be separated by non-digits (spaces, dashes, parens). */
export function phoneMatchRegex(last10: string): RegExp {
  if (last10.length !== 10) return /^$/;
  const pattern = last10.split('').join('\\D*');
  return new RegExp(pattern);
}
