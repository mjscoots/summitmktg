import { Flame, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { useRepSignups } from '@/hooks/useRepSignups';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { role } = useAuth();
  const { streakData } = useStreak();
  const { signedThisWeek } = useRepSignups();
  const isManager = role === 'manager' || role === 'admin';

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

      {/* Signed This Week - Manager only */}
      {isManager && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>{signedThisWeek} signed</span>
        </div>
      )}
    </div>
  );
}
