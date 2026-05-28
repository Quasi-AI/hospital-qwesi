import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';

export const DEFAULT_HOSPITAL_NAME = '';

export function normalizeHospitalName(value: unknown) {
  const title = String(value || '').trim();
  if (!title || title === 'AI Doctor' || title === 'AI Doc') {
    return DEFAULT_HOSPITAL_NAME;
  }
  return title;
}

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
      systemTitle: normalizeHospitalName(o.systemTitle),
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
