import { useEffect } from 'react';

/**
 * Public page motion, Pass 183.
 *
 * Two jobs, both cheap and both off under prefers-reduced-motion:
 *
 * 1. Reveal marked sections once, at 15 percent visibility. The section is only
 *    marked visible; the clipped line reveals and the card stagger are CSS off
 *    that one attribute, so nothing is animated from script.
 * 2. Weight the section titles as they cross the viewport. Archivo is loaded as a
 *    variable face, so each title moves from weight 600 at the bottom of the
 *    viewport to 800 at the centre. One rect read per title per frame, no writes
 *    that force layout, and the rAF loop only runs while a title is on screen.
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

    // Kinetic titles.
    const titles = Array.from(document.querySelectorAll<HTMLElement>('.section-title'));
    const live = new Set<HTMLElement>();
    let frame = 0;
    const tick = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      live.forEach((title) => {
        const rect = title.getBoundingClientRect();
        const from = window.innerHeight;
        const span = Math.max(1, from - mid);
        const t = Math.max(0, Math.min(1, (from - rect.top) / span));
        title.style.fontVariationSettings = `'wght' ${Math.round(600 + t * 200)}`;
      });
      if (live.size > 0) frame = requestAnimationFrame(tick);
    };
    const titleObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const node = entry.target as HTMLElement;
        if (entry.isIntersecting) live.add(node);
        else live.delete(node);
      });
      if (live.size > 0 && !frame) frame = requestAnimationFrame(tick);
    });
    titles.forEach((title) => titleObserver.observe(title));

    return () => {
      observer.disconnect();
      titleObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
      titles.forEach((title) => {
        title.style.fontVariationSettings = '';
      });
    };
  }, []);
}
