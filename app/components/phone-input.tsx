'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, AsYouType, type CountryCode } from 'libphonenumber-js';

const flag = (c: string) => String.fromCodePoint(...c.toUpperCase().split('').map((ch) => 127397 + ch.charCodeAt(0)));
const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
const nameOf = (c: string) => { try { return names?.of(c) || c; } catch { return c; } };

const ALL = getCountries().map((c) => ({ code: c, dial: getCountryCallingCode(c), name: nameOf(c) })).sort((a, b) => a.name.localeCompare(b.name));

/**
 * Phone field with a country picker. The country is detected from the visitor's location (/api/geo) unless the
 * stored number already has a country code. onChange always receives the full international number (+233595553746)
 * once the number is valid, otherwise whatever has been typed so far, so Qwesi's WhatsApp credit account matches.
 */
export default function PhoneInput({
  value, onChange, required, label = 'Phone', onValidity,
}: { value: string; onChange: (e164: string) => void; required?: boolean; label?: string; onValidity?: (ok: boolean) => void }) {
  const initial = useMemo(() => {
    const p = value ? parsePhoneNumberFromString(value.startsWith('+') ? value : `+${value.replace(/\D/g, '')}`) : undefined;
    return { country: (p?.country as CountryCode | undefined) || null, national: p?.nationalNumber ? String(p.nationalNumber) : value.replace(/\D/g, '') };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<CountryCode>(initial.country || 'GH');
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (initial.country) return;
    let cancelled = false;
    fetch('/api/geo').then((r) => r.json()).then((d) => { if (!cancelled && d?.country && getCountries().includes(d.country)) setCountry(d.country); }).catch(() => {});
    return () => { cancelled = true; };
  }, [initial.country]);

  useEffect(() => {
    const digits = national.replace(/\D/g, '').replace(/^0+/, '');
    const parsed = digits ? parsePhoneNumberFromString(`+${getCountryCallingCode(country)}${digits}`) : undefined;
    const ok = Boolean(parsed?.isValid());
    onValidity?.(ok);
    onChange(digits ? (parsed?.number || `+${getCountryCallingCode(country)}${digits}`) : '');
  }, [country, national]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => { const s = q.trim().toLowerCase(); return s ? ALL.filter((c) => c.name.toLowerCase().includes(s) || c.dial.startsWith(s.replace('+', '')) || c.code.toLowerCase() === s) : ALL; }, [q]);

  return (
    <div className="relative block">
      <span className="mb-1 block truncate text-sm font-medium text-gray-700">{label}{required ? ' *' : ''}</span>
      <div className="flex h-11 overflow-hidden rounded-xl border border-gray-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex shrink-0 items-center gap-1.5 border-r border-gray-200 bg-gray-50 px-3 text-sm hover:bg-gray-100" aria-label="Choose country code" aria-expanded={open}>
          <span className="text-lg leading-none">{flag(country)}</span>
          <span className="font-medium text-gray-700">+{getCountryCallingCode(country)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
        <input
          type="tel" inputMode="tel" autoComplete="tel-national" required={required}
          value={national ? new AsYouType(country).input(national.replace(/\D/g, '')) : ''}
          onChange={(e) => {
            const v = e.target.value;
            // A pasted/typed full international number (+233..., 00233..., or +2330...) picks the country by itself
            if (/^\s*(\+|00)/.test(v)) {
              const p = parsePhoneNumberFromString(v.replace(/^\s*00/, '+'));
              if (p?.country) { setCountry(p.country); setNational(String(p.nationalNumber)); return; }
            }
            let d = v.replace(/[^\d\s()-]/g, '');
            const cc = getCountryCallingCode(country);
            const digits = d.replace(/\D/g, '');
            if (digits.startsWith(cc) && digits.length > cc.length + 7) d = digits.slice(cc.length);   // country code typed again
            setNational(d);
          }}
          placeholder="Phone number" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] rounded-xl border border-gray-200 bg-white shadow-xl">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country or code" className="w-full rounded-t-xl border-b border-gray-100 px-3 py-2 text-sm outline-none" />
          <ul className="max-h-60 overflow-y-auto py-1">
            {list.map((c) => (
              <li key={c.code}>
                <button type="button" onClick={() => { setCountry(c.code); setOpen(false); setQ(''); }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-brand-50 ${c.code === country ? 'bg-brand-50 font-semibold' : ''}`}>
                  <span className="text-lg leading-none">{flag(c.code)}</span><span className="flex-1 truncate">{c.name}</span><span className="text-gray-500">+{c.dial}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-3 py-2 text-sm text-gray-500">No match</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
