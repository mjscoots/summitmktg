import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Pass 178: on desktop the section pins for one viewport while the doors slide
 * in from the right one after another. On a phone, or under reduced motion, it
 * is the plain stacked reveal from Pass 177.
 */
export default function ThreeDoorSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const canPin =
      window.matchMedia('(min-width: 1024px)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canPin) return;
    setPinned(true);

    const section = sectionRef.current;
    if (!section) return;
    const scroller = document.getElementById('root');
    const target: HTMLElement | Window = scroller || window;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = section.getBoundingClientRect();
        const span = Math.max(1, rect.height - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -rect.top / span));
        for (let i = 0; i < 3; i += 1) {
          const p = Math.min(1, Math.max(0, progress * 3 - i));
          section.style.setProperty(`--door-p-${i + 1}`, p.toFixed(3));
        }
      });
    };

    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`public-section public-reveal px-5 py-16 md:px-8 md:py-24 ${pinned ? 'doors-pin' : ''}`}
      data-reveal
    >
      <div className={pinned ? 'doors-sticky' : ''}>
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <Link to="/industries/pest" className="public-door public-door-pest card-spotlight door-slide door-slide-1 block min-h-44 overflow-hidden bg-card p-5">
              <p className="micro-label text-primary">Live</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">Pest</h2>
              <p className="mt-4 text-text-secondary">The summer lane.</p>
            </Link>
            <Link to="/industries/fiber" className="public-door card-spotlight door-slide door-slide-2 block min-h-44 bg-card p-5">
              <p className="micro-label text-muted-foreground">Off season lane</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">Fiber</h2>
            </Link>
          </div>
          <p className="door-slide door-slide-3 mt-10 text-sm text-muted-foreground">Life insurance is coming</p>
        </div>
      </div>
    </section>
  );
}
