import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pay ladder as a track — the signature element.
 *
 * Tiers sit on one horizontal rail, the current position is marked, and the
 * next tier says exactly what is missing. Used in three places with the same
 * shape: the public calculator (tier reached by the numbers entered), My Money
 * (the rep's real position), and Command (any leader).
 */
export interface LadderTier {
  /** Range label, e.g. "$40k–$60k". */
  label: string;
  /** Rate label, e.g. "18%". */
  rateLabel: string;
  /** Lower bound of the tier in dollars. */
  min: number;
  /** Upper bound, or null for the top tier. */
  max: number | null;
}

interface PayLadderTrackProps {
  tiers: LadderTier[];
  /** Current amount on the ladder (active revenue). */
  value: number;
  /** Label for the amount, e.g. "Active revenue". */
  valueLabel?: string;
  /** Formats every dollar amount shown. */
  formatAmount: (n: number) => string;
  /** Optional: makes a tier tappable (public calculator jumps the inputs). */
  onTierSelect?: (tier: LadderTier, index: number) => void;
  className?: string;
}

/** One 180 ms ease when the number changes. Nothing bounces. */
function TickNumber({ children }: { children: string }) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    setKey((k) => k + 1);
  }, [children]);
  return (
    <span key={key} className="animate-count-up stat-num inline-block">
      {children}
    </span>
  );
}

export function PayLadderTrack({
  tiers,
  value,
  valueLabel = 'Active revenue',
  formatAmount,
  onTierSelect,
  className,
}: PayLadderTrackProps) {
  if (tiers.length === 0) return null;

  const currentIndex = tiers.findIndex(
    (t) => value >= t.min && (t.max === null || value <= t.max)
  );
  const reached = currentIndex >= 0;
  const nextTier = currentIndex >= 0 ? tiers[currentIndex + 1] ?? null : tiers[0];
  const missing = nextTier ? Math.max(nextTier.min - value, 0) : 0;

  // Marker position: progress through the whole rail, in tier-width steps.
  const step = 100 / tiers.length;
  const within = (() => {
    if (!reached) return 0;
    const t = tiers[currentIndex];
    if (t.max === null) return 1;
    const span = t.max - t.min;
    return span > 0 ? Math.min((value - t.min) / span, 1) : 1;
  })();
  const markerPct = reached ? Math.min(currentIndex * step + within * step, 100) : 0;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="micro-label">{valueLabel}</p>
          <p className="stat-value mt-1">
            <TickNumber>{formatAmount(value)}</TickNumber>
          </p>
        </div>
        <div className="text-right">
          <p className="micro-label">Tier reached</p>
          <p className="mt-1 text-base font-semibold text-foreground stat-num">
            {reached ? `${tiers[currentIndex].label} · ${tiers[currentIndex].rateLabel}` : 'None yet'}
          </p>
        </div>
      </div>

      {/* Rail */}
      <div className="relative pt-3">
        <div className="h-1.5 w-full rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${markerPct}%`, transition: 'width var(--motion-base) var(--motion-ease)' }}
          />
        </div>
        <div
          className="absolute top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-background bg-primary"
          style={{ left: `${markerPct}%`, transition: 'left var(--motion-base) var(--motion-ease)' }}
          aria-hidden="true"
        />
      </div>

      {/* Tier stops */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}
      >
        {tiers.map((t, i) => {
          const isCurrent = i === currentIndex;
          const isNext = nextTier === t;
          const content = (
            <>
              <p className="text-xs text-muted-foreground stat-num">{t.label}</p>
              <p
                className={cn(
                  'text-sm font-semibold stat-num',
                  isCurrent ? 'text-primary' : 'text-foreground'
                )}
              >
                {t.rateLabel}
              </p>
            </>
          );
          const base = cn(
            'min-h-11 rounded border px-1 py-2 text-center',
            isCurrent
              ? 'border-primary bg-primary/10'
              : isNext
              ? 'border-border-strong bg-secondary/40'
              : 'border-border bg-transparent'
          );
          return onTierSelect ? (
            <button
              key={i}
              type="button"
              onClick={() => onTierSelect(t, i)}
              className={cn(base, 'hover:border-primary/60')}
              aria-label={`Set inputs to reach ${t.label} at ${t.rateLabel}`}
            >
              {content}
            </button>
          ) : (
            <div key={i} className={base}>
              {content}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {nextTier ? (
          <>
            Next tier {nextTier.label} pays {nextTier.rateLabel}.{' '}
            <span className="font-semibold text-foreground stat-num">{formatAmount(missing)}</span> of
            active revenue missing.
          </>
        ) : (
          'Top tier reached. There is no higher tier.'
        )}
      </p>
    </div>
  );
}

export default PayLadderTrack;
