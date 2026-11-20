/** Section ids on the public landing page - use with `/#id` from other public routes. */
export const PUBLIC_LANDING_NAV_ITEMS = [
  ['doctors', 'Doctors'],
  ['specialties', 'Specialties'],
  ['how', 'How it works'],
  ['plans', 'Plans'],
  ['faq', 'FAQ'],
  ['contact', 'Contact'],
] as const;

export type PublicLandingNavId = (typeof PUBLIC_LANDING_NAV_ITEMS)[number][0];

export const publicLandingNavLinkClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-800';

/** Nav links on dark header */
export const publicLandingNavLinkClassDark =
  'rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white';
