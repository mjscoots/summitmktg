import { Flame } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { TrainingProgressBadge } from '@/components/layout/TrainingProgressBadge';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { streakData } = useStreak();

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

      {/* Personal Training Progress - Replaces "Reps Signed" */}
      <TrainingProgressBadge variant="compact" />
    </div>
  );
}
