import { useEffect } from 'react';

/**
 * Public page motion, Pass 181. One job: reveal marked sections once as a plain
 * fade with a small rise, and activate the footer signature. The pointer
 * spotlight and the magnetic pull are gone, so no pointer handler runs on the
 * cover at all. Under prefers-reduced-motion everything is visible immediately.
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
      { threshold: 0.2 }
    );
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);
}
