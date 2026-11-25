/**
 * Display currency by visitor location: Ghana sees cedis, Nigeria sees naira, everyone else sees US dollars.
 * Practitioners still set (and are paid in) their own currency; this only changes what each visitor reads.
 * The location comes from the IP address (set once per request in the root layout), so server-rendered and
 * client-rendered prices always agree.
 */
export type DisplayCurrency = 'GHS' | 'NGN' | 'USD';

/** How many units of each currency equal 1 US dollar. Overridable from the server env (see rates()). */
export type Rates = Record<string, number>;

export const DEFAULT_RATES: Rates = { USD: 1, GHS: 15, NGN: 1500, KES: 130, ZAR: 18 };

export function currencyForCountry(country?: string | null): DisplayCurrency {
  const c = (country || '').toUpperCase();
  if (c === 'GH') return 'GHS';
  if (c === 'NG') return 'NGN';
  return 'USD';
}

/** Server-side: current rates from environment variables (USD_TO_GHS_RATE, USD_TO_NGN_RATE, ...). */
export function ratesFromEnv(): Rates {
  const num = (v: string | undefined, d: number) => (Number(v) > 0 ? Number(v) : d);
  return {
    USD: 1,
    GHS: num(process.env.USD_TO_GHS_RATE, DEFAULT_RATES.GHS),
    NGN: num(process.env.USD_TO_NGN_RATE, DEFAULT_RATES.NGN),
    KES: num(process.env.USD_TO_KES_RATE, DEFAULT_RATES.KES),
    ZAR: num(process.env.USD_TO_ZAR_RATE, DEFAULT_RATES.ZAR),
  };
}

// Set once per render by <MoneyProvider> (same value on the server and in the browser).
let current: { currency: DisplayCurrency; rates: Rates } = { currency: 'GHS', rates: DEFAULT_RATES };

export function setMoneyContext(currency: DisplayCurrency, rates: Rates) {
  current = { currency, rates: { ...DEFAULT_RATES, ...rates } };
}
export function getDisplayCurrency(): DisplayCurrency { return current.currency; }

export function convertAmount(amount: number, from: string, to: string, rates: Rates = current.rates): number {
  const f = rates[from?.toUpperCase()] || 0;
  const t = rates[to?.toUpperCase()] || 0;
  if (!f || !t || from === to) return amount;
  return (amount / f) * t;
}

const SYMBOL: Record<string, string> = { USD: '$', GHS: 'GH₵', NGN: '₦', KES: 'KSh', ZAR: 'R' };

export function formatMoney(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const whole = code === 'NGN' || code === 'GHS' || code === 'KES' || amount >= 100;
  const n = whole ? Math.round(amount) : Math.round(amount * 100) / 100;
  const text = n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: whole ? 0 : 2 });
  return `${SYMBOL[code] || code + ' '}${text}`;
}

/** A fee as the current visitor should read it ("≈" when it was converted from the practitioner's own currency). */
export function feeForViewer(fee: number, currency = 'GHS'): { text: string; converted: boolean; original: string } {
  const own = currency.toUpperCase();
  const original = formatMoney(fee, own);
  const to = current.currency;
  if (own === to) return { text: original, converted: false, original };
  return { text: `≈ ${formatMoney(convertAmount(fee, own, to), to)}`, converted: true, original };
}
