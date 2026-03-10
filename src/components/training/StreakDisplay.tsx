import { useNavigate } from 'react-router-dom';
import { Flame, RotateCcw } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StreakDisplayProps {
  variant?: 'large' | 'compact';
  className?: string;
  clickable?: boolean;
}

export function StreakDisplay({ variant = 'large', className, clickable = false }: StreakDisplayProps) {
  const navigate = useNavigate();
  const { streakData, restoreStreak, isRestoring, getStreakMessage } = useStreak();

  const streakCount = streakData.currentStreak;
  const lostStreak = streakData.previousStreak > 0 && streakCount <= 1;
  const canRestore = lostStreak && streakData.restoresRemaining > 0;

  const handleClick = () => {
    if (clickable) {
      navigate('/app/training');
    }
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await restoreStreak();
    if (success) {
      toast.success(`🔥 Streak restored! You're back on day ${streakData.previousStreak + 1}!`);
    } else {
      toast.error('Could not restore streak.');
    }
  };

  if (variant === 'compact') {
    // Show lost streak state
    if (lostStreak) {
      return (
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl",
          "bg-destructive/10 border border-destructive/30",
          className
        )}>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-destructive">
              Streak lost ({streakData.previousStreak} days)
            </span>
            {canRestore && (
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline mt-0.5"
              >
                <RotateCcw className="w-3 h-3" />
                {isRestoring ? 'Restoring...' : 'Restore now'}
                <span className="text-muted-foreground font-normal ml-1">
                  ({streakData.restoresRemaining} remaining)
                </span>
              </button>
            )}
          </div>
        </div>
      );
    }

    if (streakCount === 0) return null;

    return (
      <button
        onClick={handleClick}
        disabled={!clickable}
        title={clickable ? 'Keep your training streak alive! Click to continue.' : undefined}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl",
          "bg-gradient-to-r from-warning/20 to-warning/10",
          "border border-warning/30",
          "transition-all duration-300",
          clickable && "cursor-pointer hover:scale-105 hover:from-warning/30 hover:border-warning/50",
          !clickable && "cursor-default",
          className
        )}
      >
        <span className="text-2xl font-black text-warning">
          {streakCount}
        </span>
        <Flame className="w-5 h-5 text-warning animate-pulse" />
      </button>
    );
  }

  // Large variant for training page
  if (lostStreak) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-3",
        "bg-gradient-to-br from-destructive/15 via-destructive/10 to-destructive/5",
        "rounded-xl border border-destructive/25",
        "relative overflow-hidden",
        className
      )}>
        <div className="relative z-10 flex items-center gap-2">
          <Flame className="w-5 h-5 text-destructive opacity-50" />
          <span className="font-black text-lg text-destructive">
            Streak Lost — {streakData.previousStreak} days
          </span>
        </div>
        {canRestore && (
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="relative z-10 mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-sm font-bold hover:bg-primary/25 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isRestoring ? 'Restoring...' : 'Restore Streak'}
            <span className="text-xs text-muted-foreground font-normal ml-1">
              ({streakData.restoresRemaining} remaining)
            </span>
          </button>
        )}
      </div>
    );
  }

  if (streakCount === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-3",
        "bg-gradient-to-br from-warning/15 via-warning/10 to-warning/5",
        "rounded-xl border border-warning/25",
        "relative overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-radial from-warning/20 to-transparent opacity-50" />
      <div className="relative z-10 flex items-center gap-2">
        <Flame className="w-5 h-5 text-warning animate-pulse" />
        <span className="font-black text-2xl text-warning">
          Day {streakCount}
        </span>
        <Flame className="w-5 h-5 text-warning animate-pulse" />
      </div>
      <p className="relative z-10 text-xs text-warning/80 mt-1 font-medium">
        {streakCount === 1 ? "You showed up. That's everything." : "Keep it going!"}
      </p>
    </div>
  );
}
