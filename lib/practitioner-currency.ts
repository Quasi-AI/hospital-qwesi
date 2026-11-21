/** Currencies practitioners can charge in (all supported by Paystack). */
export const CURRENCIES = ['USD', 'GHS', 'NGN', 'KES', 'ZAR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'US dollar (USD)',
  GHS: 'Ghana cedi (GHS)',
  NGN: 'Nigerian naira (NGN)',
  KES: 'Kenyan shilling (KES)',
  ZAR: 'South African rand (ZAR)',
};

export function normalizeCurrency(value: unknown, fallback: Currency = 'GHS'): Currency {
  const v = typeof value === 'string' ? value.toUpperCase() : '';
  return (CURRENCIES as readonly string[]).includes(v) ? (v as Currency) : fallback;
}
