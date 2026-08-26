import { cn } from '@/lib/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Seven bars, one per day of the current week, from the rep's own logged
 * sales. Today is drawn in the accent.
 */
export function WeekBars({
  bars,
  trainingMinutes,
  onOpen,
}: {
  bars: number[];
  trainingMinutes: number;
  onOpen: () => void;
}) {
  const todayIdx = (new Date().getDay() + 6) % 7;
  const max = Math.max(1, ...bars);

  return (
    <button type="button" onClick={onOpen} className="card-ice w-full p-3 text-left">
      <p className="micro-label">Your week</p>
      <div className="mt-3 flex items-end justify-between gap-1.5">
        {bars.map((n, i) => (
          <div key={DAYS[i]} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[11px] tabular-nums text-muted-foreground">{n}</span>
            <div
              className={cn('w-full rounded-t-[4px]', i === todayIdx ? 'bg-primary' : 'surface-elevated')}
              style={{ height: `${Math.max(4, Math.round((n / max) * 56))}px` }}
            />
            <span className="text-[10px] text-muted-foreground">{DAYS[i].slice(0, 1)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        <span className="tabular-nums text-foreground">{trainingMinutes}</span> training minutes this week
      </p>
    </button>
  );
}

export default WeekBars;
