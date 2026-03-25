import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMyPoints, CapStatus } from '@/hooks/useMyPoints';
import { Clock, Flame, MessageSquare, BookOpen, Video, FileText, Zap, Trophy, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface MyPointsDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CapBar({ label, icon: Icon, color, cap }: { label: string; icon: any; color: string; cap: CapStatus }) {
  const pct = cap.max > 0 ? Math.round((cap.earned / cap.max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className={cn('font-bold tabular-nums', pct >= 100 ? 'text-success' : 'text-foreground')}>
            {cap.earned}/{cap.max}
          </span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>
    </div>
  );
}

export function MyPointsDashboard({ open, onOpenChange }: MyPointsDashboardProps) {
  const { data, isLoading } = useMyPoints();

  if (!data && isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading points...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data) return null;

  const we = data.weeklyEvents;
  const weeklyBreakdown = [
    { icon: Clock, color: 'text-blue-500', label: 'Hours Logged', value: data.weeklyHoursPoints },
    { icon: Zap, color: 'text-primary', label: 'Threshold Bonus', value: data.weeklyThresholdBonus },
    { icon: Flame, color: 'text-primary', label: 'Login + Streak', value: (we.daily_login || 0) + (we.streak || 0) },
    { icon: MessageSquare, color: 'text-primary', label: 'Chat', value: we.chat || 0 },
    { icon: BookOpen, color: 'text-primary', label: 'Lessons + Quizzes', value: (we.lesson || 0) + (we.quiz_bonus || 0) },
    { icon: Video, color: 'text-purple-500', label: 'Videos', value: we.video || 0 },
    { icon: FileText, color: 'text-primary', label: 'Manual', value: we.manual || 0 },
  ].filter(x => x.value > 0);

  const hoursToday = Math.floor(data.timeTodayMinutes / 60);
  const minsToday = data.timeTodayMinutes % 60;
  const hoursWeek = Math.floor(data.timeWeekMinutes / 60);

  // Guidance tips
  const tips: string[] = [];
  if (data.capsToday.hours.earned < 300) tips.push(`You can earn ${600 - data.capsToday.hours.earned} more pts from hours today.`);
  if (data.capsToday.chat.earned === 0) tips.push('Send messages in chat to earn up to 400 pts/day.');
  if (data.currentStreak > 0 && data.timeTodayMinutes < 20) tips.push('Do 20 min of training today to keep your streak!');
  if (data.nextThreshold.targetMinutes && data.nextThreshold.remainingMinutes > 0) {
    tips.push(`${data.nextThreshold.remainingMinutes} min to next weekly bonus (+${data.nextThreshold.bonus} pts).`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            My Points
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Score cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">This Week</p>
              <p className="text-2xl font-black text-primary tabular-nums">{data.weeklyTotal.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border border-border/30 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">All-Time</p>
              <p className="text-2xl font-black text-foreground tabular-nums">{data.allTimeTotal.toLocaleString()}</p>
            </div>
          </div>

          {/* Time + Streak row */}
          <div className="flex gap-3">
            <div className="flex-1 p-2.5 rounded-lg bg-muted/30 border border-border/20">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold">{hoursToday}h {minsToday}m today</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{hoursWeek}h this week</p>
            </div>
            <div className="flex-1 p-2.5 rounded-lg bg-muted/30 border border-border/20">
              <div className="flex items-center gap-1.5">
                <Flame className={cn('w-3.5 h-3.5', data.currentStreak >= 7 ? 'text-primary' : 'text-primary/70')} />
                <span className="text-xs font-bold">{data.currentStreak}d streak</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Best: {data.longestStreak}d</p>
            </div>
          </div>

          {/* Weekly breakdown */}
          {weeklyBreakdown.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Weekly Breakdown</p>
              <div className="space-y-2">
                {weeklyBreakdown.map(({ icon: Icon, color, label, value }) => (
                  <div key={label} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/20">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('w-4 h-4', color)} />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                    <span className={cn('text-sm font-bold tabular-nums', color)}>+{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily caps */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Today's Cap Status</p>
            <div className="space-y-2">
              <CapBar icon={Clock} color="text-blue-500" label="Hours" cap={data.capsToday.hours} />
              <CapBar icon={MessageSquare} color="text-primary" label="Chat" cap={data.capsToday.chat} />
              <CapBar icon={BookOpen} color="text-primary" label="Lessons" cap={data.capsToday.lesson} />
              <CapBar icon={Video} color="text-purple-500" label="Videos" cap={data.capsToday.video} />
            </div>
          </div>

          {/* Threshold progress */}
          {data.nextThreshold.targetMinutes && data.nextThreshold.remainingMinutes > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">Next Weekly Bonus</span>
              </div>
              <Progress value={Math.round((data.timeWeekMinutes / data.nextThreshold.targetMinutes) * 100)} className="h-1.5 mb-1" />
              <p className="text-[10px] text-muted-foreground">
                {data.timeWeekMinutes}/{data.nextThreshold.targetMinutes} min — <strong>+{data.nextThreshold.bonus} pts</strong> in {data.nextThreshold.remainingMinutes} min
              </p>
            </div>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Opportunities</span>
              </div>
              {tips.map((tip, i) => (
                <p key={i} className="text-[11px] text-muted-foreground mt-0.5">• {tip}</p>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
