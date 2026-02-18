import { Flame, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStreak } from '@/hooks/useStreak';
import { TrainingProgressBadge } from '@/components/layout/TrainingProgressBadge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function StatusBar() {
  const { streakData } = useStreak();
  const [momentum, setMomentum] = useState(0);

  useEffect(() => {
    const basePoints = Math.min(streakData.currentStreak * 10, 50);
    const activityPoints = Math.min(streakData.totalDaysActive * 3, 30);
    const randomBonus = Math.floor(Math.random() * 20);
    setMomentum(Math.min(basePoints + activityPoints + randomBonus, 100));
  }, [streakData]);

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
            <p className="font-semibold mb-1">⚡ Momentum: {momentum}%</p>
            <p className="text-muted-foreground">Weekly engagement based on logins, platform time & interactions</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
