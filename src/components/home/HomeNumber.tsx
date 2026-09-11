import { useState } from 'react';
import { useHomeNumber } from '@/hooks/useHomeNumber';
import { Skeleton } from '@/components/ui/skeleton';
import { CountUp } from '@/components/shared/CountUp';

/**
 * The figure a home opens on, above the hero. When the person saved a goal in
 * earnings_goals the season figure is shown against it; otherwise the number
 * stands on its own.
 *
 * Pass 179: when the workspace tracks a season figure too, tapping the number
 * flips between this week and this season. Both values come from the same read.
 */
export function HomeNumber({ vertical }: { vertical: string }) {
  const { value, label, season, goal, loading } = useHomeNumber(vertical);
  const [mode, setMode] = useState<'week' | 'season'>('week');

  if (loading) return <Skeleton className="h-20 w-full" />;

  const canFlip = season !== null;
  const showSeason = canFlip && mode === 'season';
  const shown = showSeason ? (season as number) : value;
  const shownLabel = showSeason ? 'Accounts this season' : label;

  const figure = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{shownLabel}</p>
      <p
        key={mode}
        className="number-flip mt-1 text-[44px] font-bold leading-none tracking-tight tabular-nums text-accent"
      >
        {typeof shown === 'number' ? <CountUp value={shown} duration={700} /> : shown}
      </p>
    </>
  );

  return (
    <section aria-label={shownLabel}>
      {canFlip ? (
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'week' ? 'season' : 'week'))}
          className="block w-full min-h-11 text-left"
          aria-label={showSeason ? 'Show this week' : 'Show this season'}
        >
          {figure}
        </button>
      ) : (
        figure
      )}
      {season !== null && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          {goal
            ? showSeason
              ? `Goal ${goal}`
              : `Season ${season} of ${goal} goal`
            : showSeason
              ? 'Tap to see this week'
              : `Season ${season}`}
        </p>
      )}
    </section>
  );
}

export default HomeNumber;
