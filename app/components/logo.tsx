/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

/**
 * Qwesi AI logo.
 *  - variant "full": brain mark + "QWESI AI" wordmark
 *  - variant "mark": brain only (compact spots)
 *  - tone "dark": white wordmark, for dark / purple backgrounds
 * The PNGs have transparent backgrounds (public/brand).
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
  const src = variant === 'mark' ? '/brand/qwesi-mark.png' : tone === 'dark' ? '/brand/qwesi-logo-white.png' : '/brand/qwesi-logo.png';
  const ratio = variant === 'mark' ? 98 / 97 : 419 / 97;
  return (
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
}

export function LogoLink({ href = '/', ...props }: { href?: string } & React.ComponentProps<typeof Logo>) {
  return (
    <Link href={href} aria-label="Qwesi AI home" className="inline-flex shrink-0 items-center">
      <Logo {...props} />
    </Link>
  );
}
