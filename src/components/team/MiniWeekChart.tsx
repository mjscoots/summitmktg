import { cn } from '@/lib/utils';
import { formatTimeMinutes } from '@/hooks/useActivityTracking';

interface DayData {
  minutes: number;
}

interface MiniWeekChartProps {
  /** 7-element array Mon-Sun with minutes per day */
  days: DayData[];
  totalMinutes: number;
  className?: string;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MiniWeekChart({ days, totalMinutes, className }: MiniWeekChartProps) {
  const activeDays = days.filter(d => d.minutes > 0).length;
  const maxMin = Math.max(...days.map(d => d.minutes), 1);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Mini bars */}
      <div className="flex items-end gap-[3px] h-4">
        {days.map((day, i) => {
          const pct = day.minutes > 0 ? Math.max((day.minutes / maxMin) * 100, 20) : 0;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "w-[6px] rounded-[1px] transition-all",
                  day.minutes > 0 ? "bg-primary" : "bg-muted-foreground/20"
                )}
                style={{ height: day.minutes > 0 ? `${(pct / 100) * 16}px` : '3px' }}
                title={`${DAY_LABELS[i]}: ${day.minutes > 0 ? formatTimeMinutes(day.minutes) : '—'}`}
              />
            </div>
          );
        })}
      </div>

      {/* Summary text */}
      <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
        {totalMinutes > 0 ? (
          <>
            <span className="text-foreground font-medium">{formatTimeMinutes(totalMinutes)}</span>
            {' · '}
            {activeDays}/7d
          </>
        ) : (
          <span className="text-muted-foreground/50">No activity</span>
        )}
      </span>
    </div>
  );
}
