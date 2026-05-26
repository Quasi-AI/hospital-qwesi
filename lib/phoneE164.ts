import parsePhoneNumberFromString, { type CountryCode } from 'libphonenumber-js';

/**
 * Format for Twilio (E.164). Uses defaultCountry when the number is national (e.g. 017… with BD).
 */
export function phoneToE164(phone: string, defaultCountry?: CountryCode): string | null {
  const t = phone.trim();
  if (!t) return null;

  const tryParse = (input: string, region?: CountryCode) => {
    const n = parsePhoneNumberFromString(input, region);
    return n?.isValid() ? n.format('E.164') : null;
  };

  // Prefer clinic default region for national numbers so values like 1749… are not
  // guessed as another country (e.g. +91) before applying Notification Settings → SMS country.
  if (defaultCountry) {
    let e164 = tryParse(t.replace(/\s/g, ''), defaultCountry);
    if (e164) return e164;
    const digits = t.replace(/\D/g, '');
    e164 = tryParse(digits, defaultCountry);
    if (e164) return e164;
  }

  let e164 = tryParse(t);
  if (e164) return e164;

  e164 = tryParse(t.replace(/\s/g, ''));
  if (e164) return e164;

  const d = t.replace(/\D/g, '');
  if (d.length === 10) {
    e164 = tryParse(`+1${d}`);
    if (e164) return e164;
  }

  return null;
}
