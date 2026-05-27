import Link from 'next/link';
import type { MouseEvent } from 'react';
import { Stethoscope } from 'lucide-react';

export function PublicSiteBrand({
  brand,
  logoUrl,
  onNavigate,
  variant = 'default',
  /** Light text & borders for dark headers (e.g. hero-aligned bar) */
  inverse = false,
  /** Target when the logo is clicked (e.g. `"/#hero"` for landing hero) */
  href = '/',
  /** When false, no image or icon badge—typographic title only (see inverse/clinical styling). */
  showLogoGraphic = true,
}: {
  brand: string;
  logoUrl: string;
  onNavigate?: () => void;
  /** Clinical: teal accent for public hospital site */
  variant?: 'default' | 'clinical';
  inverse?: boolean;
  href?: string;
  showLogoGraphic?: boolean;
}) {
  const clinical = variant === 'clinical';
  const resolvedLogoUrl = logoUrl.trim() || '/logo.png';

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.();
    if (typeof window === 'undefined') return;
    if (!href.startsWith('/#')) return;
    const id = href.slice(2);
    if (!id || window.location.pathname !== '/') return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `/#${id}`);
  };

  const defaultTitleClass = `truncate text-sm font-semibold tracking-tight sm:text-base ${
    inverse ? 'text-white' : clinical ? 'text-slate-900' : 'text-gray-900'
  }`;

  const textOnlyTitleClass = inverse
    ? 'block max-w-[10.5rem] truncate whitespace-nowrap bg-gradient-to-br from-white via-teal-100 to-cyan-200 bg-clip-text text-sm font-extrabold leading-tight tracking-tight text-transparent motion-safe:transition motion-safe:duration-200 motion-safe:group-hover:brightness-110 sm:max-w-[16rem] sm:text-base lg:max-w-[20rem] lg:text-lg'
    : clinical
      ? 'block max-w-[10.5rem] truncate whitespace-nowrap bg-gradient-to-br from-slate-900 via-teal-800 to-teal-600 bg-clip-text text-sm font-extrabold leading-tight tracking-tight text-transparent motion-safe:transition motion-safe:duration-200 motion-safe:group-hover:brightness-95 sm:max-w-[16rem] sm:text-base lg:max-w-[20rem] lg:text-lg'
      : 'block max-w-[10.5rem] truncate whitespace-nowrap bg-gradient-to-br from-gray-900 via-blue-900 to-blue-600 bg-clip-text text-sm font-extrabold leading-tight tracking-tight text-transparent sm:max-w-[16rem] sm:text-base lg:max-w-[20rem] lg:text-lg';

  return (
    <Link
      href={href}
      className={`group flex min-w-0 shrink-0 items-center gap-2.5 ${showLogoGraphic ? '' : 'gap-0'}`}
      onClick={handleClick}
    >
      {showLogoGraphic ? (
        resolvedLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedLogoUrl}
            alt=""
            className={`h-10 w-10 rounded-xl object-contain shadow-md ${
              inverse
                ? 'border border-white/25 bg-white/95 ring-1 ring-white/10'
                : clinical
                  ? 'border border-teal-100 bg-white ring-1 ring-teal-900/5'
                  : 'border border-gray-200 bg-white shadow-sm'
            }`}
          />
        ) : (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md ${clinical ? 'bg-gradient-to-br from-teal-500 to-teal-700 shadow-teal-600/30' : 'bg-blue-600 shadow-sm'}`}
          >
            <Stethoscope className="h-5 w-5 text-white" aria-hidden />
          </span>
        )
      ) : inverse ? (
        <span className="relative isolate min-w-0 pr-0.5">
          <span
            className="absolute left-0 top-1/2 h-[1em] w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-teal-400 via-cyan-400 to-teal-600 shadow-[0_0_14px_rgba(45,212,191,0.45)]"
            aria-hidden
          />
          <span className={`pl-3.5 ${textOnlyTitleClass}`}>{brand}</span>
        </span>
      ) : (
        <span className={`${textOnlyTitleClass} pl-0.5`}>{brand}</span>
      )}
      {showLogoGraphic ? (
        <span className={defaultTitleClass}>{brand}</span>
      ) : null}
    </Link>
  );
}
