'use client';

import { useMemo } from 'react';
import { useSettings } from '@/app/contexts/SettingsContext';
import { formatCurrencyAmount, normalizeCurrencyCode } from '@/lib/formatCurrency';

/**
 * Uses Settings → General → Currency (ISO code) for all formatted amounts.
 */
export function useFormatCurrency() {
  const { settings } = useSettings();
  const currencyCode = normalizeCurrencyCode(settings?.currency);

  const formatCurrency = useMemo(
    () => (amount: number) => formatCurrencyAmount(amount, currencyCode),
    [currencyCode]
  );

  return { formatCurrency, currencyCode };
}
