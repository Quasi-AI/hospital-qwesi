import type { CountryCode } from 'libphonenumber-js';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { countryCodeFromAddressField, countryCodeFromSmsSettingsField } from '@/lib/phoneCountryFields';

/**
 * Default region for parsing national numbers (e.g. 017… with BD → +880…).
 * Order: Notification Settings → SMS default country code, then organisation address country.
 */
export async function getDefaultPhoneCountry(): Promise<CountryCode | undefined> {
  await dbConnect();
  const s = await Settings.findOne({})
    .select('notificationProviders.sms.defaultCountryCode address.country')
    .lean();
  const sms = s?.notificationProviders?.sms as { defaultCountryCode?: string } | undefined;
  const fromNotifications = countryCodeFromSmsSettingsField(sms?.defaultCountryCode);
  if (fromNotifications) return fromNotifications;
  return countryCodeFromAddressField(s?.address?.country);
}
