import { useHomeNumber } from '@/hooks/useHomeNumber';
import { Skeleton } from '@/components/ui/skeleton';
import { CountUp } from '@/components/shared/CountUp';

/**
 * The figure a home opens on, above the hero. When the person saved a goal in
 * earnings_goals the season figure is shown against it; otherwise the number
 * stands on its own.
 */
export function HomeNumber({ vertical }: { vertical: string }) {
  const { value, label, season, goal, loading } = useHomeNumber(vertical);

  if (loading) return <Skeleton className="h-20 w-full" />;

  return (
    <section aria-label={label}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-[44px] font-bold leading-none tracking-tight tabular-nums text-foreground">
        {typeof value === 'number' ? <CountUp value={value} duration={700} /> : value}
      </p>
      {season !== null && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          {goal ? `Season ${season} of ${goal} goal` : `Season ${season}`}
        </p>
      )}
    </section>
  );
}

export default HomeNumber;
