/**
 * ISO 4217 currency options for Settings and other pickers.
 * Uses Intl when available so the list stays aligned with the runtime (typically ~160 codes).
 */

export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

const FALLBACK_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
];

function narrowCurrencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

function buildCurrencyOptions(): CurrencyOption[] {
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: 'currency') => string[];
    };
    if (typeof Intl === 'undefined' || typeof intl.supportedValuesOf !== 'function') {
      return FALLBACK_CURRENCIES;
    }
    const codes = intl.supportedValuesOf('currency');
    const displayNames = new Intl.DisplayNames(['en'], { type: 'currency' });
    return codes
      .map((code) => ({
        code,
        name: displayNames.of(code) ?? code,
        symbol: narrowCurrencySymbol(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  } catch {
    return FALLBACK_CURRENCIES;
  }
}

/** All currencies supported by the environment, sorted by English name */
export const CURRENCY_OPTIONS: CurrencyOption[] = buildCurrencyOptions();

/**
 * Options for a &lt;select&gt;, ensuring `savedCode` appears even if missing from the built list
 * (e.g. data from an older client or typo — still selectable).
 */
export function getCurrencySelectOptions(savedCode?: string | null): CurrencyOption[] {
  const trimmed = (savedCode || '').trim().toUpperCase();
  if (!trimmed || !/^[A-Z]{3}$/.test(trimmed)) {
    return CURRENCY_OPTIONS;
  }
  if (CURRENCY_OPTIONS.some((c) => c.code === trimmed)) {
    return CURRENCY_OPTIONS;
  }
  return [
    {
      code: trimmed,
      name: trimmed,
      symbol: narrowCurrencySymbol(trimmed),
    },
    ...CURRENCY_OPTIONS,
  ];
}
