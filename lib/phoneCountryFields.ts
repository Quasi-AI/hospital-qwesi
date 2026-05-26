import type { CountryCode } from 'libphonenumber-js';

const COUNTRY_NAMES: Record<string, CountryCode> = {
  bangladesh: 'BD',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  canada: 'CA',
  india: 'IN',
  australia: 'AU',
};

/** Map Settings → address.country (name or ISO-3166 alpha-2). Safe for client components. */
export function countryCodeFromAddressField(countryField?: string | null): CountryCode | undefined {
  const raw = countryField?.trim();
  if (!raw) return undefined;
  if (raw.length === 2 && /^[a-z]{2}$/i.test(raw)) {
    return raw.toUpperCase() as CountryCode;
  }
  return COUNTRY_NAMES[raw.toLowerCase()];
}

/** From Notification Settings → SMS → default country code field. */
export function countryCodeFromSmsSettingsField(code?: string | null): CountryCode | undefined {
  const raw = code?.trim().toUpperCase();
  if (raw && /^[A-Z]{2}$/.test(raw)) {
    return raw as CountryCode;
  }
  return undefined;
}
