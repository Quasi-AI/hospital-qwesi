import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';

export type LandingSettingsSnapshot = {
  systemTitle: string;
  systemDescription: string;
  invoiceLogoUrl: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
  };
} | null;

export async function getLandingSettings(): Promise<LandingSettingsSnapshot> {
  try {
    await dbConnect();
    const s = await Settings.findOne()
      .select('systemTitle systemDescription address invoiceLogoUrl')
      .lean();
    if (!s) return null;
    const o = s as Record<string, unknown>;
    return {
      systemTitle: String(o.systemTitle || ''),
      systemDescription: String(o.systemDescription || ''),
      invoiceLogoUrl: String(o.invoiceLogoUrl || ''),
      address: (typeof o.address === 'object' && o.address !== null ? o.address : {}) as NonNullable<
        LandingSettingsSnapshot
      >['address'],
    };
  } catch {
    return null;
  }
}
