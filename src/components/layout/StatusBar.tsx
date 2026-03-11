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
  const percentage = progress.percentage;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2 lg:px-3 py-1 rounded-full bg-card border border-border/60 text-xs font-medium text-muted-foreground cursor-default">
          <Flame className={cn(
            "w-3 h-3 flex-shrink-0",
            streakData.currentStreak > 0 ? "text-orange-400" : "text-muted-foreground"
          )} />
          <span className={cn(
            "tabular-nums",
            streakData.currentStreak > 0 && "text-orange-400"
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
        <p>🔥 {streakData.currentStreak} day streak · 📈 {percentage}% training</p>
      </TooltipContent>
    </Tooltip>
  );
}
