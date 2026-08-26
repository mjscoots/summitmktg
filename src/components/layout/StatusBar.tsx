import { Flame, ChevronRight } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { usePersonalTrainingProgress } from '@/hooks/usePersonalTrainingProgress';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function StatusBar() {
  const { streakData } = useStreak();
  const { progress, isLoading } = usePersonalTrainingProgress();
  const percentage = progress.overall;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-surface px-3 text-xs font-semibold text-muted-foreground cursor-default">
          <Flame className={cn(
            "w-3 h-3 flex-shrink-0",
            streakData.currentStreak > 0 ? "text-primary" : "text-muted-foreground"
          )} />
          <span className={cn(
            "tabular-nums",
            streakData.currentStreak > 0 && "text-foreground"
          )}>
            {streakData.currentStreak}d
          </span>
          <span className="text-border">·</span>
          <span className="tabular-nums">
            {isLoading ? '—' : `${percentage}%`}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{streakData.currentStreak} day streak · {percentage}% training</p>
      </TooltipContent>
    </Tooltip>
  );
}
