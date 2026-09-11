import { useEffect } from 'react';

/**
 * Public page motion: reveals marked sections once, activates the footer
 * signature, and drives the Pass 178 micro interactions (a pointer spotlight
 * inside cards, and a magnetic pull on the primary action). Both extras are
 * desktop only and off under prefers-reduced-motion.
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

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return () => observer.disconnect();

    const onMove = (event: PointerEvent) => {
      const spotlight = (event.target as HTMLElement | null)?.closest?.('.card-spotlight') as HTMLElement | null;
      if (spotlight) {
        const rect = spotlight.getBoundingClientRect();
        spotlight.style.setProperty('--sx', `${event.clientX - rect.left}px`);
        spotlight.style.setProperty('--sy', `${event.clientY - rect.top}px`);
      }
      document.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;
        const near = Math.abs(dx) < rect.width / 2 + 40 && Math.abs(dy) < rect.height / 2 + 40;
        const limit = 6;
        el.style.setProperty('--mx', near ? `${Math.max(-limit, Math.min(limit, dx / 6)).toFixed(2)}px` : '0px');
        el.style.setProperty('--my', near ? `${Math.max(-limit, Math.min(limit, dy / 6)).toFixed(2)}px` : '0px');
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);
}
