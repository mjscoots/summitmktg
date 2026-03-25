import { Clock, Zap, MessageSquare, Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PointsBreakdown } from '@/hooks/useMyPoints';

interface TodaysProgressProps {
  data: PointsBreakdown;
}

export function TodaysProgress({ data }: TodaysProgressProps) {
  const hoursToday = data.timeTodayMinutes / 60;
  const eliteGoal = 5; // 5 hours = elite
  const elitePercent = Math.min((hoursToday / eliteGoal) * 100, 100);
  
  const dailyPointsEarned = 
    data.capsToday.hours.earned + 
    data.capsToday.chat.earned + 
    data.capsToday.lesson.earned + 
    data.capsToday.video.earned + 
    data.capsToday.manual.earned;

  const dailyPointsRemaining = 
    (data.capsToday.hours.max - data.capsToday.hours.earned) +
    (data.capsToday.chat.max - data.capsToday.chat.earned) +
    (data.capsToday.lesson.max - data.capsToday.lesson.earned) +
    (data.capsToday.video.max - data.capsToday.video.earned) +
    (data.capsToday.manual.max - data.capsToday.manual.earned);

  const momentumLevel = hoursToday < 1 ? 'Cold' : hoursToday < 2 ? 'Warming Up' : hoursToday < 4 ? 'Locked In' : 'Elite';
  const momentumColor = hoursToday < 1 ? 'text-muted-foreground' : hoursToday < 2 ? 'text-blue-400' : hoursToday < 4 ? 'text-primary' : 'text-primary';

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Today's Progress</h2>
        <span className={cn("ml-auto text-xs font-bold px-2 py-0.5 rounded-full", 
          hoursToday < 1 ? "bg-muted text-muted-foreground" :
          hoursToday < 2 ? "bg-blue-500/15 text-blue-400" :
          hoursToday < 4 ? "bg-primary/15 text-primary" :
          "bg-primary/15 text-primary"
        )}>
          {momentumLevel}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Training Time</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-foreground tabular-nums">{hoursToday.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">/ {eliteGoal} hrs</span>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Daily Points</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-foreground tabular-nums">{dailyPointsEarned}</span>
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Chat Points</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-foreground tabular-nums">{data.capsToday.chat.earned}</span>
            <span className="text-xs text-muted-foreground">/ {data.capsToday.chat.max}</span>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className={cn("w-3.5 h-3.5", 
              data.currentStreak >= 14 ? "text-primary" :
              data.currentStreak >= 7 ? "text-primary" :
              data.currentStreak >= 3 ? "text-blue-400" :
              "text-muted-foreground"
            )} />
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Streak</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-xl font-black tabular-nums",
              data.currentStreak >= 14 ? "text-primary" :
              data.currentStreak >= 7 ? "text-primary" :
              data.currentStreak >= 3 ? "text-blue-400" :
              "text-foreground"
            )}>{data.currentStreak}</span>
            <span className="text-xs text-muted-foreground">{data.currentStreak === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
      </div>

      {/* Elite Training Goal bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-foreground">Elite Training Goal</span>
          <span className="text-xs text-muted-foreground tabular-nums">{hoursToday.toFixed(1)} / {eliteGoal} hrs</span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-700",
              elitePercent === 100 
                ? "bg-gradient-to-r from-yellow-500 to-amber-400" 
                : "bg-gradient-to-r from-primary to-blue-400"
            )}
            style={{ width: `${elitePercent}%` }}
          />
        </div>
      </div>

      {/* Removed verbose opportunity hint */}
    </div>
  );
}
