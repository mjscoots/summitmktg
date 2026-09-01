import { usePublicCounters } from '@/hooks/usePublicRecruiting';
import { COVER_STATS } from '@/lib/coverStats';

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
if (counters.signed_season) items.push({ value: counters.signed_season, label: 'signed this season' });
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
          className="rounded border border-border bg-card px-5 py-3 text-center"
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

  if (!COVER_STATS) return null;
  if (!counters || counters.serviced_total <= 0) return null;

  const serviced = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(counters.serviced_total);

  return (
    <div className="public-proof-strip" aria-label="Summit production proof">
      <span><strong>{serviced}</strong> serviced</span>
      <span aria-hidden="true">·</span>
      <span><strong>{counters.signed_2027.toLocaleString()}</strong> signed for 2027</span>
    </div>
  );
}
