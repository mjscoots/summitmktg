import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
  variant?: 'large' | 'compact';
  className?: string;
  clickable?: boolean;
}

/**
 * Streak display component with animated flame icon
 * - large: For /app/training page (prominent display)
 * - compact: For home page (smaller, clickable)
 */
export function StreakDisplay({ variant = 'large', className, clickable = false }: StreakDisplayProps) {
  const navigate = useNavigate();
  const { streakData } = useStreak();

  const streakCount = streakData.currentStreak;

  const handleClick = () => {
    if (clickable) {
      navigate('/app/training');
    }
  };

  if (streakCount === 0) return null;

  if (variant === 'compact') {
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
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-warning/20 to-transparent opacity-50" />
      
      {/* Main content */}
      <div className="relative z-10 flex items-center gap-2">
        <Flame className="w-5 h-5 text-warning animate-pulse" />
        <span className="font-black text-2xl text-warning">
          Day {streakCount}
        </span>
        <Flame className="w-5 h-5 text-warning animate-pulse" />
      </div>

      {/* Short motivational text */}
      <p className="relative z-10 text-xs text-warning/80 mt-1 font-medium">
        {streakCount === 1 ? "You showed up. That's everything." : "Keep it going!"}
      </p>
    </div>
  );
}
