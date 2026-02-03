import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreak } from '@/hooks/useStreak';

interface StreakCounterProps {
  className?: string;
}

export function StreakCounter({ className }: StreakCounterProps) {
  const { streakData } = useStreak();
  
  if (streakData.currentStreak === 0) return null;

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl",
      "bg-warning/20 border border-warning/30",
      "backdrop-blur-sm shadow-lg",
      className
    )}>
      <span className="text-2xl font-black text-warning">
        {streakData.currentStreak}
      </span>
      <div className="relative">
        <Flame className="w-6 h-6 text-warning animate-pulse" />
        {/* Glow effect */}
        <div className="absolute inset-0 blur-sm">
          <Flame className="w-6 h-6 text-warning animate-pulse" />
        </div>
      </div>
    </div>
  );
}
