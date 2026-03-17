import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRookieView } from '@/contexts/RookieViewContext';
import { useMyPoints } from '@/hooks/useMyPoints';
import { AppLayout } from '@/components/layout/AppLayout';
import { StreakCelebration } from '@/components/training/StreakCelebration';
import { useStreak } from '@/hooks/useStreak';
import { CommandCenterHeader } from '@/components/dashboard/CommandCenterHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { OnboardingQuest } from '@/components/dashboard/OnboardingQuest';
import { ContinueLearning } from '@/components/dashboard/ContinueLearning';
import { TodoList } from '@/components/dashboard/TodoList';
import { DashboardFunnelTracker } from '@/components/dashboard/DashboardFunnelTracker';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { OnboardingAlert } from '@/components/dashboard/OnboardingAlert';
import { MyPointsDashboard } from '@/components/points/MyPointsDashboard';
import { EarningsWidget } from '@/components/dashboard/EarningsWidget';
import { PointSystemModal } from '@/components/points/PointSystemModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, CheckCircle, Clock, Flame, MessageSquare, Target, BookOpen, Gift, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ListTodo, GitBranch } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted/20 p-4 space-y-2">
              <Skeleton className="h-3 w-8 mx-auto" />
              <Skeleton className="h-7 w-12 mx-auto" />
              <Skeleton className="h-2 w-10 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role, profile, user, isLoading } = useAuth();
  const { isImpersonating, impersonatedUser } = useRookieView();
  const { streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, newMilestone, clearMilestone } = useStreak();
  const { data: pointsData, isLoading: pointsLoading } = useMyPoints();
  const [showPoints, setShowPoints] = useState(false);
  const [showPointSystem, setShowPointSystem] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [challengeData, setChallengeData] = useState<any>(null);
  const [dashboardView, setDashboardView] = useState<'todo' | 'funnel'>('todo');
  const [chatMsgCount, setChatMsgCount] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  const isManager = !isImpersonating && (role === 'manager' || role === 'admin' || role === 'owner');
  const displayName = isImpersonating && impersonatedUser ? impersonatedUser.full_name : profile?.full_name;
  const firstName = displayName?.split(' ')[0] || 'there';

  // Check training completion
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const { data: courses } = await supabase
          .from('training_courses')
          .select('id, target_role, training_modules ( id, training_lessons ( id, is_active ) )')
          .eq('is_active', true);

        const lessonIds = new Set<string>();
        (courses || []).forEach((course: any) => {
          if (course.target_role !== null && course.target_role !== 'rookie') return;
          course.training_modules?.forEach((mod: any) => {
            mod.training_lessons?.forEach((l: any) => {
              if (l.is_active !== false) lessonIds.add(l.id);
            });
          });
        });

        const { count } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('completed_at', 'is', null);

        setTrainingComplete((count || 0) >= lessonIds.size && lessonIds.size > 0);
      } catch {
        setTrainingComplete(false);
      }
    };
    check();
  }, [user]);

  // Fetch today's chat message count + leaderboard rank
  useEffect(() => {
    if (!user) return;
    const fetchChatCount = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_ai', false)
          .gte('created_at', today.toISOString());
        setChatMsgCount(count || 0);
      } catch {}
    };

    const fetchRank = async () => {
      try {
        const { data } = await (supabase.rpc as any)('get_current_leaderboard');
        if (data) {
          const myEntry = data.find((e: any) => e.user_id === user.id);
          if (myEntry) setLeaderboardRank(Number(myEntry.rank));
        }
      } catch {}
    };

    fetchChatCount();
    fetchRank();
    const interval = setInterval(fetchChatCount, 15_000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch daily challenge
  const fetchChallenge = useCallback(async () => {
    if (!user) return;
    try {
      const { data: raw } = await (supabase.rpc as any)('get_daily_challenge', { _user_id: user.id });
      if (raw?.all_complete && !challengeData?.all_complete) {
        toast.success(`Daily Challenge complete! +${raw.bonus_points} pts bonus!`);
      }
      setChallengeData(raw);
    } catch {}
  }, [user, challengeData?.all_complete]);

  useEffect(() => {
    fetchChallenge();
    const interval = setInterval(fetchChallenge, 30_000);
    return () => clearInterval(interval);
  }, [fetchChallenge]);

  if (isLoading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  const hoursToday = pointsData ? pointsData.timeTodayMinutes / 60 : 0;
  const eliteGoal = 5;
  const elitePercent = Math.min((hoursToday / eliteGoal) * 100, 100);
  const momentumLevel = hoursToday < 1 ? 'Cold' : hoursToday < 2 ? 'Warming Up' : hoursToday < 4 ? 'Locked In' : 'Elite';

  const dailyPointsEarned = pointsData
    ? pointsData.capsToday.hours.earned + pointsData.capsToday.chat.earned + pointsData.capsToday.lesson.earned + pointsData.capsToday.video.earned + pointsData.capsToday.manual.earned
    : 0;

  const challengeCompleted = challengeData?.objectives?.filter((o: any) => o.complete).length || 0;
  const challengeTotal = challengeData?.objectives?.length || 3;

  const OBJECTIVE_ICONS: Record<string, typeof Clock> = { training: Clock, chat: MessageSquare, lessons: BookOpen };
  const OBJECTIVE_COLORS: Record<string, string> = { training: 'text-primary', chat: 'text-blue-400', lessons: 'text-green-400' };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-4 animate-fade-in ambient-glow relative z-10">
        <OnboardingAlert />

        {isManager ? (
          <CommandCenterHeader />
        ) : (
          /* ── HERO CARD ── */
          <div className="glass-card rounded-2xl p-5 mb-5 relative overflow-hidden">
            {/* Gradient glow behind hero */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'var(--gradient-primary)' }} />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-10 blur-2xl pointer-events-none" style={{ background: 'hsl(263 84% 58%)' }} />
            
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground leading-tight mb-1 relative z-10">
              Welcome back, <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="text-xs text-muted-foreground mb-4 relative z-10">
              Complete training. Build momentum.
            </p>

            {/* Hero stats row */}
            {pointsData && (
              <div className="grid grid-cols-4 gap-2.5 relative z-10">
                {[
                  { icon: Flame, value: `${dailyPointsEarned}`, label: 'PTS TODAY', color: 'text-amber-400', glow: 'hsl(43 96% 56% / 0.15)' },
                  { icon: Clock, value: `${hoursToday.toFixed(1)}h`, label: 'TRAINING', color: 'text-primary', glow: 'hsl(217 91% 60% / 0.15)' },
                  { icon: Trophy, value: leaderboardRank ? `#${leaderboardRank}` : '—', label: 'RANK', color: 'text-yellow-400', glow: 'hsl(43 96% 56% / 0.12)' },
                  { icon: TrendingUp, value: `${pointsData.currentStreak}`, label: 'STREAK', color: 'text-orange-400', glow: 'hsl(25 95% 53% / 0.12)' },
                ].map(({ icon: Icon, value, label, color, glow }) => (
                  <div
                    key={label}
                    className="rounded-xl p-2.5 text-center group hover:-translate-y-0.5 transition-all duration-250 border border-border/20"
                    style={{ background: `linear-gradient(180deg, hsl(230 20% 10%), hsl(230 20% 7%))`, boxShadow: `0 0 20px -8px ${glow}` }}
                  >
                    <Icon className={cn("w-3.5 h-3.5 mx-auto mb-1", color)} />
                    <p className="text-lg font-bold text-foreground tabular-nums leading-tight animate-count-up">{value}</p>
                    <p className="text-[7px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <QuickActions />


        {/* Mission Board Toggle: To-Do / Funnel Tracker */}
        {isManager && (
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setDashboardView('todo')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-250",
                dashboardView === 'todo'
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Missions
            </button>
            <button
              onClick={() => setDashboardView('funnel')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-250",
                dashboardView === 'funnel'
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Funnel Tracker
            </button>
          </div>
        )}
        {dashboardView === 'todo' || !isManager ? <TodoList /> : <DashboardFunnelTracker />}

        {/* See My Points — glass card */}
        <button
          onClick={() => setShowPoints(true)}
          className="w-full mb-5 px-4 py-3 glass-card rounded-xl flex items-center gap-2.5 glass-card-hover group"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-gold)' }}>
            <Trophy className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">My Points</span>
          <span className="text-xs text-muted-foreground ml-auto group-hover:text-foreground transition-colors">View →</span>
        </button>

        {/* ── TODAY'S DASHBOARD ── */}
        {pointsData ? (
          <div className="glass-card rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                <Zap className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Today's Progress</h2>
              <span className={cn("ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                hoursToday < 1 ? "bg-muted/40 text-muted-foreground" :
                hoursToday < 2 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                hoursToday < 4 ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
              )}>
                {momentumLevel}
              </span>
            </div>

            {/* Elite progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">Elite Goal</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{hoursToday.toFixed(1)} / {eliteGoal}h</span>
              </div>
              <div className="progress-track">
                <div
                  className={cn("progress-fill", elitePercent === 100 && "!bg-none")}
                  style={{
                    width: `${elitePercent}%`,
                    ...(elitePercent === 100 ? { background: 'var(--gradient-gold)' } : {}),
                  }}
                />
              </div>
            </div>

            {/* Daily Challenge */}
            {challengeData && (
              <div className={cn("p-3.5 rounded-xl border", challengeData.all_complete ? "bg-success/5 border-success/20" : "bg-muted/10 border-border/30")}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Target className={cn("w-3.5 h-3.5", challengeData.all_complete ? "text-success" : "text-muted-foreground")} />
                  <span className="text-xs font-bold text-foreground">Daily Challenge</span>
                  <span className={cn("ml-auto text-[10px] font-semibold",
                    challengeData.all_complete ? "text-success" : "text-muted-foreground"
                  )}>{challengeCompleted}/{challengeTotal}</span>
                </div>
                <div className="space-y-2">
                  {challengeData.objectives?.map((obj: any) => {
                    const Icon = OBJECTIVE_ICONS[obj.type] || Target;
                    const color = OBJECTIVE_COLORS[obj.type] || 'text-primary';
                    const percent = Math.min((obj.current / obj.target) * 100, 100);
                    return (
                      <div key={obj.type} className="flex items-center gap-2.5">
                        <div className={cn("shrink-0", obj.complete ? "text-success" : color)}>
                          {obj.complete ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[11px] font-medium", obj.complete ? "text-success line-through" : "text-foreground")}>{obj.label}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {obj.type === 'training' ? `${Math.round(obj.current)}/${obj.target}m` : `${obj.current}/${obj.target}`}
                            </span>
                          </div>
                          <div className="progress-track mt-1">
                            <div className={cn("h-full rounded-full transition-all duration-700", obj.complete ? "bg-success" : "")} style={{ width: `${percent}%`, ...(!obj.complete ? { background: 'var(--gradient-primary)' } : {}) }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {challengeData.all_complete && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-success">
                    <Gift className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">+{challengeData.bonus_points} pts earned!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : pointsLoading ? (
          <div className="glass-card rounded-2xl p-5 mb-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-muted/20 p-3 space-y-2">
                  <Skeleton className="h-3 w-3 mx-auto" />
                  <Skeleton className="h-6 w-10 mx-auto" />
                  <Skeleton className="h-2 w-8 mx-auto" />
                </div>
              ))}
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ) : null}

        {/* Continue Learning */}
        {pointsData && <ContinueLearning data={pointsData} isComplete={trainingComplete} />}

        {/* Earnings Widget */}
        <EarningsWidget />

        {/* Onboarding Quest (Rookie only) */}
        {!isManager && <OnboardingQuest />}
      </div>

      <GuidedTour />

      {showStreakCelebration && streakData.currentStreak > 0 && (
        <StreakCelebration
          streak={streakData.currentStreak}
          milestone={newMilestone}
          message={getStreakMessage()}
          onComplete={() => { clearStreakCelebration(); clearMilestone(); }}
        />
      )}

      {showPoints && <MyPointsDashboard open={showPoints} onOpenChange={setShowPoints} />}
      {showPointSystem && <PointSystemModal open={showPointSystem} onOpenChange={setShowPointSystem} />}
    </AppLayout>
  );
}
