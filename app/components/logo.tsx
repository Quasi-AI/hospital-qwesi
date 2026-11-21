/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

/**
 * Qwesi AI logo.
 *  - variant "full": brain mark + "QWESI AI" wordmark
 *  - variant "mark": brain only (compact spots)
 *  - tone "dark": for dark / purple backgrounds — the original logo is shown on
 *    its white background, as a rounded white badge.
 */
export function Logo({
  variant = 'full',
  tone = 'light',
  className = 'h-9',
  priority = false,
}: {
  variant?: 'full' | 'mark';
  tone?: 'light' | 'dark';
  className?: string;
  priority?: boolean;
}) {
  const onDark = tone === 'dark';
  const src = onDark ? '/brand/qwesi-logo-original.png' : variant === 'mark' ? '/brand/qwesi-mark.png' : '/brand/qwesi-logo.png';
  const ratio = onDark ? 436 / 130 : variant === 'mark' ? 98 / 97 : 419 / 97;
  const img = (
    <img
      src={src}
      alt="Qwesi AI"
      width={Math.round(40 * ratio)}
      height={40}
      className={`w-auto select-none ${className}`}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      draggable={false}
    />
  );
  // original artwork has a white background: keep it, as a clean rounded white badge
  return onDark ? <span className="inline-flex overflow-hidden rounded-xl bg-white shadow-lg shadow-black/20 ring-1 ring-white/40">{img}</span> : img;
}

export function LogoLink({ href = '/', ...props }: { href?: string } & React.ComponentProps<typeof Logo>) {
  return (
    <Link href={href} aria-label="Qwesi AI home" className="inline-flex shrink-0 items-center">
      <Logo {...props} />
    </Link>
  );
}
