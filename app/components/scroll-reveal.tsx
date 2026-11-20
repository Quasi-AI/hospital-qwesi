'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Lightweight, dependency-free scroll animations.
 * Elements with `.reveal` (or direct children of `.reveal-stagger`) fade/slide in
 * once as they enter the viewport. New nodes (client-fetched cards, route changes)
 * are picked up through a MutationObserver. Respects prefers-reduced-motion.
 */
export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      return;
    }
    root.setAttribute('data-reveal-ready', '');

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const seen = new WeakSet<Element>();
    const watch = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      io.observe(el);
    };
    const scan = (scope: ParentNode) => {
      scope.querySelectorAll('.reveal').forEach(watch);
      scope.querySelectorAll('.reveal-stagger').forEach((parent) => {
        Array.from(parent.children).forEach((child, i) => {
          const el = child as HTMLElement;
          if (!el.classList.contains('reveal')) {
            el.classList.add('reveal');
            el.style.setProperty('--d', `${Math.min(i, 8) * 70}ms`);
          }
          watch(el);
        });
      });
    };

    scan(document);
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => scan(document));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
