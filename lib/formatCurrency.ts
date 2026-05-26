/**
 * Format money using ISO 4217 currency codes from system settings.
 */

/** Locales that pair well with common currencies for Intl.NumberFormat */
const CURRENCY_LOCALE_HINTS: Record<string, string> = {
  USD: 'en-US',
  CAD: 'en-CA',
  AUD: 'en-AU',
  EUR: 'de-DE',
  GBP: 'en-GB',
  CHF: 'de-CH',
  CNY: 'zh-CN',
  INR: 'en-IN',
  BRL: 'pt-BR',
  JPY: 'ja-JP',
};

export function normalizeCurrencyCode(code: string | null | undefined): string {
  const c = (code || 'USD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : 'USD';
}

export function formatCurrencyAmount(
  amount: number,
  currencyCode: string | null | undefined,
  options?: { locale?: string }
): string {
  const code = normalizeCurrencyCode(currencyCode);
  const locale = options?.locale ?? CURRENCY_LOCALE_HINTS[code];
  const n = Number.isFinite(amount) ? amount : 0;
  const maxFrac = code === 'JPY' || code === 'KRW' ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: maxFrac === 0 ? 0 : 2,
      maximumFractionDigits: maxFrac,
    }).format(n);
  } catch {
    return `${code} ${n.toFixed(maxFrac === 0 ? 0 : 2)}`;
  }
}
