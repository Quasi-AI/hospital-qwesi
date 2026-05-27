/** Section ids on `HospitalLanding` — use with `/#id` from other public routes. */
export const PUBLIC_LANDING_NAV_ITEMS = [
  ['highlights', 'Highlights'],
  ['about', 'About'],
  ['services', 'Services'],
  ['subscriptions', 'Plans'],
  ['departments', 'Departments'],
  ['providers', 'Providers'],
  ['visit', 'Visit'],
  ['stories', 'Stories'],
  ['faq', 'FAQ'],
  ['contact', 'Contact'],
] as const;

export type PublicLandingNavId = (typeof PUBLIC_LANDING_NAV_ITEMS)[number][0];

export const publicLandingNavLinkClass =
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-teal-50/85 hover:text-teal-900 after:pointer-events-none after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-teal-600 after:transition-transform hover:after:scale-x-100 motion-reduce:after:transition-none';

/** Nav links on dark hero-aligned header */
export const publicLandingNavLinkClassDark =
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-teal-100/90 transition-colors hover:bg-white/10 hover:text-white after:pointer-events-none after:absolute after:inset-x-1.5 after:bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-teal-300 after:transition-transform hover:after:scale-x-100 motion-reduce:after:transition-none xl:px-2.5 xl:py-2 xl:text-sm xl:after:inset-x-2 xl:after:bottom-1';
