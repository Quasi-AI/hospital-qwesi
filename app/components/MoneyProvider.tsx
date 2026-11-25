'use client';

import { currencyForCountry, setMoneyContext, type Rates } from '@/lib/money';

/** Puts the visitor's display currency in place before anything renders (server and browser alike). */
export default function MoneyProvider({ country, rates, children }: { country: string | null; rates: Rates; children: React.ReactNode }) {
  setMoneyContext(currencyForCountry(country), rates);
  return <>{children}</>;
}
