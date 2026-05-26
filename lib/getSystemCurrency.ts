import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { normalizeCurrencyCode } from '@/lib/formatCurrency';

/** Server-side: currency from Settings (Mongo), defaults to USD */
export async function getSystemCurrency(): Promise<string> {
  try {
    await dbConnect();
    const doc = await Settings.findOne().select('currency').lean();
    const c = (doc as { currency?: string } | null)?.currency;
    return normalizeCurrencyCode(c);
  } catch {
    return 'USD';
  }
}
