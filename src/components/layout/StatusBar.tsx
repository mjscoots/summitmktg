import { Flame, Zap } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { TrainingProgressBadge } from '@/components/layout/TrainingProgressBadge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMyPoints } from '@/hooks/useMyPoints';

export function StatusBar() {
  const { streakData } = useStreak();
  const { data: pointsData } = useMyPoints();

  // Compute momentum from real data
  const hoursToday = pointsData ? pointsData.timeTodayMinutes / 60 : 0;
  const momentum = hoursToday < 1 ? 0 : hoursToday < 2 ? 30 : hoursToday < 3 ? 50 : hoursToday < 4 ? 70 : hoursToday < 5 ? 85 : 100;

  const getMomentumColor = (pct: number) => {
    if (pct >= 71) return 'text-success';
    if (pct >= 41) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getMomentumBg = (pct: number) => {
    if (pct >= 71) return 'bg-success/10 border-success/30';
    if (pct >= 41) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-destructive/10 border-destructive/30';
  };

  const momentumLabel = hoursToday < 1 ? 'Cold' : hoursToday < 2 ? 'Warming Up' : hoursToday < 4 ? 'Locked In' : 'Elite';

  return (
    <div className="flex items-center gap-2">
      {/* Streak Pill */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
          streakData.currentStreak > 0
            ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
            : "bg-muted text-muted-foreground border border-border/50"
        )}
      >
        <Flame className={cn(
          "w-3.5 h-3.5",
          streakData.currentStreak > 0 ? "text-orange-400" : "text-muted-foreground"
        )} />
        <span>{streakData.currentStreak} day{streakData.currentStreak !== 1 ? 's' : ''}</span>
      </div>

      {/* Personal Training Progress */}
      <TrainingProgressBadge variant="compact" />

      {/* Momentum Pill */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
              getMomentumBg(momentum)
            )}
          >
            <Zap className={cn("w-3.5 h-3.5", getMomentumColor(momentum))} />
            <span className={cn("font-medium", getMomentumColor(momentum))}>
              {momentum}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="text-xs">
            <p className="font-semibold mb-1">⚡ Momentum: {momentumLabel}</p>
            <p className="text-muted-foreground">Based on today's training time ({hoursToday.toFixed(1)} hrs)</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
