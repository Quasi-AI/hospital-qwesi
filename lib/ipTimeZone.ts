import { isValidTimeZone } from '@/lib/timezone';

// Used only when the host gives a country but not a zone (countries with several zones get their main one).
const COUNTRY_ZONE: Record<string, string> = {
  GH: 'Africa/Accra', NG: 'Africa/Lagos', CI: 'Africa/Abidjan', SN: 'Africa/Dakar', CM: 'Africa/Douala', KE: 'Africa/Nairobi',
  UG: 'Africa/Kampala', TZ: 'Africa/Dar_es_Salaam', ET: 'Africa/Addis_Ababa', ZA: 'Africa/Johannesburg', ZW: 'Africa/Harare',
  ZM: 'Africa/Lusaka', EG: 'Africa/Cairo', MA: 'Africa/Casablanca', US: 'America/New_York', CA: 'America/Toronto',
  BR: 'America/Sao_Paulo', MX: 'America/Mexico_City', JM: 'America/Jamaica', GB: 'Europe/London', IE: 'Europe/Dublin',
  FR: 'Europe/Paris', DE: 'Europe/Berlin', ES: 'Europe/Madrid', IT: 'Europe/Rome', NL: 'Europe/Amsterdam', TR: 'Europe/Istanbul',
  AE: 'Asia/Dubai', SA: 'Asia/Riyadh', IN: 'Asia/Kolkata', PK: 'Asia/Karachi', BD: 'Asia/Dhaka', SG: 'Asia/Singapore',
  PH: 'Asia/Manila', HK: 'Asia/Hong_Kong', CN: 'Asia/Shanghai', JP: 'Asia/Tokyo', AU: 'Australia/Sydney', NZ: 'Pacific/Auckland',
};

/** Where the visitor is, from their IP address (the host adds these headers: Vercel / Cloudflare). */
export function detectFromRequest(headers: Headers): { timeZone: string | null; country: string | null } {
  const country = (headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry') || '').toUpperCase() || null;
  const zone = headers.get('x-vercel-ip-timezone');
  let timeZone: string | null = null;
  if (zone) { try { timeZone = decodeURIComponent(zone); } catch { timeZone = zone; } }
  if (!isValidTimeZone(timeZone)) timeZone = country && COUNTRY_ZONE[country] ? COUNTRY_ZONE[country] : null;
  return { timeZone, country };
}
