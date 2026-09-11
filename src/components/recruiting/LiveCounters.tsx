import { useEffect, useRef, useState } from 'react';
import { usePublicCounters } from '@/hooks/usePublicRecruiting';
import { CountUp } from '@/components/shared/CountUp';

function ProofNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref}>{visible ? <CountUp value={value} duration={900} /> : '0'}</span>;
}

interface LiveCountersProps {
  /** 'inline' for the cover hero, 'section' for the recruiting page */
  variant?: 'inline' | 'section';
}

/**
 * Real numbers only. Renders nothing until both the data loads and the values
 * clear the owner-adjustable thresholds (app_settings: public_counter_min_reps /
 * public_counter_min_signs).
 */
export function LiveCounters({ variant = 'section' }: LiveCountersProps) {
  const counters = usePublicCounters();

  if (!counters) return null;

  const items: { value: number; label: string }[] = [];
  if (counters.active_reps && counters.active_reps > 0) items.push({ value: counters.active_reps, label: 'active reps' });
  if (counters.signed_season && counters.signed_season > 0) items.push({ value: counters.signed_season, label: 'signed this season' });
  if (items.length === 0) return null;

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <span key={i.label} className="inline-flex items-center gap-1.5">
            <span className="font-semibold stat-num text-foreground">{i.value.toLocaleString()}</span>
            {i.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {items.map((i) => (
        <div
          key={i.label}
          className="bg-card px-5 py-3 text-center"
        >
          <span className="text-xl font-semibold stat-num text-foreground">{i.value.toLocaleString()}</span>
          <span className="ml-2 text-sm text-muted-foreground">
            {i.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Tight, database-backed proof for the public cover. */
export function PublicProofStrip() {
  const counters = usePublicCounters();

  if (!counters) return null;
  const items: { value: number; label: string }[] = [];
  if (counters.active_reps && counters.active_reps > 0) items.push({ value: counters.active_reps, label: 'active reps' });
  if (counters.signed_season && counters.signed_season > 0) items.push({ value: counters.signed_season, label: 'signed this season' });
  if (items.length === 0) return null;

  return (
    <section className="px-5 py-10 md:px-8" aria-label="Trinity team proof">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-x-10 gap-y-4">
        {items.map((item) => (
          <p key={item.label} className="text-sm text-muted-foreground">
            <strong className="mr-2 text-2xl font-bold tabular-nums text-foreground"><ProofNumber value={item.value} /></strong>
            {item.label}
          </p>
        ))}
      </div>
    </section>
  );
}
