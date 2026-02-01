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
  const { streakData, getStreakMessage } = useStreak();
  const isManager = role === 'manager' || role === 'admin';

  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      {/* Primary: Resume Training */}
      <Button
        onClick={() => navigate('/app/training')}
        className={cn(
          "font-bold gap-2 transition-all duration-300 hover:translate-y-[-2px]",
          isManager
            ? "bg-blue-500 hover:bg-blue-600 shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.7)]"
            : "bg-green-500 hover:bg-green-600 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.7)]"
        )}
      >
        <Play className="w-4 h-4" />
        Resume Training
      </Button>

      {/* Manager: Sign a Rep */}
      {isManager && (
        <Button
          variant="outline"
          onClick={() => navigate('/app/interviews/1')}
          className="font-semibold gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500 transition-all duration-300 hover:translate-y-[-2px]"
        >
          <UserPlus className="w-4 h-4" />
          Sign a Rep
        </Button>
      )}

      {/* Metrics */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Daily Streak - Now with real data */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 hover:scale-105 cursor-default group",
          streakData.currentStreak > 0
            ? isManager
              ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]"
              : "bg-green-500/10 border-green-500/50 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]"
            : isManager
              ? "bg-blue-500/5 border-blue-500/30"
              : "bg-green-500/5 border-green-500/30"
        )}>
          <Flame className={cn(
            "w-5 h-5 transition-transform group-hover:scale-110",
            streakData.currentStreak > 0 ? "text-orange-400" : "text-muted-foreground"
          )} />
          <div className="text-sm">
            <span className={cn(
              "font-black text-lg",
              streakData.currentStreak > 0 
                ? "text-foreground" 
                : "text-muted-foreground"
            )}>
              {streakData.currentStreak}
            </span>
            <span className="text-muted-foreground ml-1.5">
              {streakData.currentStreak === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </div>

        {/* Signed This Week */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 hover:scale-105 cursor-default",
          isManager
            ? "bg-blue-500/5 border-blue-500/30"
            : "bg-green-500/5 border-green-500/30"
        )}>
          <Users className={cn(
            "w-4 h-4",
            isManager ? "text-blue-400" : "text-green-400"
          )} />
          <div className="text-sm">
            <span className="font-bold text-foreground">{signedThisWeek}</span>
            <span className="text-muted-foreground ml-1">Signed This Week</span>
          </div>
        </div>
      </div>
    </div>
  );
}
