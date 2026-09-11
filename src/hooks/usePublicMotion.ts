import { useEffect } from 'react';

/**
 * Public page motion, Pass 183.
 *
 * Two jobs, both cheap and both off under prefers-reduced-motion:
 *
 * 1. Reveal marked sections once, at 15 percent visibility. The section is only
 *    marked visible; the clipped line reveals and the card stagger are CSS off
 *    that one attribute, so nothing is animated from script.
 * Pass 184 removed the kinetic title weight, so the reveal is all that is left
 * and nothing on the page reads the scroll from here.
 */
export function usePublicMotion() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      nodes.forEach((node) => node.setAttribute('data-visible', 'true'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).setAttribute('data-visible', 'true');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);
}
