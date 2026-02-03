import { useNavigate } from 'react-router-dom';
import { Play, Flame, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { cn } from '@/lib/utils';

interface CommandBarProps {
  streak?: number;
  signedThisWeek?: number;
}

export function CommandBar({ 
  signedThisWeek = 0 
}: CommandBarProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { streakData } = useStreak();
  const isManager = role === 'manager' || role === 'admin';

  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      {/* Primary: Resume Training - Outline style */}
      <Button
        onClick={() => navigate('/app/training')}
        variant="outline"
        className="font-bold gap-2 border-primary text-white hover:bg-primary hover:text-primary-foreground transition-all"
      >
        <Play className="w-4 h-4" />
        Resume Training
      </Button>

      {/* Manager: Sign a Rep - Outline style */}
      {isManager && (
        <Button
          variant="outline"
          onClick={() => navigate('/app/interviews')}
          className="font-semibold gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Sign a Rep
        </Button>
      )}

      {/* Metrics */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Daily Streak */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200",
          streakData.currentStreak > 0
            ? "bg-primary/10 border-primary/40"
            : "bg-secondary border-border/50"
        )}>
          <Flame className={cn(
            "w-5 h-5",
            streakData.currentStreak > 0 ? "text-orange-400" : "text-muted-foreground"
          )} />
          <div className="text-sm">
            <span className={cn(
              "font-bold text-lg",
              streakData.currentStreak > 0 ? "text-foreground" : "text-muted-foreground"
            )}>
              {streakData.currentStreak}
            </span>
            <span className="text-muted-foreground ml-1.5">
              {streakData.currentStreak === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </div>

        {/* Signed This Week */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-secondary">
          <Users className="w-4 h-4 text-primary" />
          <div className="text-sm">
            <span className="font-bold text-foreground">{signedThisWeek}</span>
            <span className="text-muted-foreground ml-1">Signed This Week</span>
          </div>
        </div>
      </div>
    </div>
  );
}
