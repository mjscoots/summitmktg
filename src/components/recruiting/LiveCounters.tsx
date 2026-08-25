import { usePublicCounters } from '@/hooks/usePublicRecruiting';

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
  if (counters.active_reps) items.push({ value: counters.active_reps, label: 'active reps' });
  if (counters.signed_season) items.push({ value: counters.signed_season, label: 'signed this season' });
  if (items.length === 0) return null;

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/50">
        {items.map((i) => (
          <span key={i.label} className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#D4AF37' }} />
            <span className="font-bold tabular-nums text-white/80">{i.value.toLocaleString()}</span>
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
          className="rounded-xl border border-border bg-card/60 px-5 py-3 text-center"
        >
          <span className="text-xl font-black tabular-nums text-primary">{i.value.toLocaleString()}</span>
          <span className="ml-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            {i.label}
          </span>
        </div>
      ))}
    </div>
  );
}
