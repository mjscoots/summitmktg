import { useState, useEffect, useCallback } from 'react';
import RosterGapCounters from '@/components/roster/RosterGapCounters';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRookieView } from '@/contexts/RookieViewContext';
import { useMyPoints } from '@/hooks/useMyPoints';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnnouncementBox } from '@/components/dashboard/AnnouncementBox';
import { HomeActionRow } from '@/components/dashboard/HomeActionRow';
import { MyCarTodayCard, MyActionItemsCard, MyEventsTodayCard, ContinueVerticalSetupCard } from '@/components/dashboard/HomeOpsCards';
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
import { PointSystemModal } from '@/components/points/PointSystemModal';
import { CountUp } from '@/components/shared/CountUp';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, CheckCircle, Clock, Flame, MessageSquare, Target, BookOpen, Gift, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { lazy, Suspense } from 'react';

const DownlineGrowthCalculator = lazy(() => import("@/components/DownlineGrowthCalculator"));
import { toast } from 'sonner';
import { ListTodo, GitBranch } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        toast.success(`Daily challenge complete. +${raw.bonus_points} points.`);
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
  const dailyGoalHours = 5;
  const dailyGoalPercent = Math.min((hoursToday / dailyGoalHours) * 100, 100);

  const dailyPointsEarned = pointsData
    ? pointsData.capsToday.hours.earned + pointsData.capsToday.chat.earned + pointsData.capsToday.lesson.earned + pointsData.capsToday.video.earned + pointsData.capsToday.manual.earned
    : 0;

  const challengeCompleted = challengeData?.objectives?.filter((o: any) => o.complete).length || 0;
  const challengeTotal = challengeData?.objectives?.length || 3;

  const OBJECTIVE_ICONS: Record<string, typeof Clock> = { training: Clock, chat: MessageSquare, lessons: BookOpen };
  const OBJECTIVE_COLORS: Record<string, string> = { training: 'text-primary', chat: 'text-blue-400', lessons: 'text-primary' };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-4 animate-fade-in relative z-10">
        <OnboardingAlert />

        {isManager ? (
          <CommandCenterHeader />
        ) : (
          /* ── HERO CARD ── */
          <div className="glass-card relative mb-5 overflow-hidden rounded-[var(--radius)] p-5 sm:p-6">
            <h1 className="relative z-10 mb-1.5 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
              Welcome back, {firstName}
            </h1>
            <p className="relative z-10 mb-5 text-[13px] text-muted-foreground">
              Your points, activity and rank today.
            </p>

            {/* Hero stats row */}
            {pointsData && (
              <div className="relative z-10 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { icon: Flame, node: <CountUp value={dailyPointsEarned} />, label: 'Pts today' },
                  { icon: Clock, node: <CountUp value={hoursToday} decimals={1} suffix="h" />, label: 'Training' },
                  { icon: Trophy, node: leaderboardRank ? <CountUp value={leaderboardRank} prefix="#" /> : <span className="stat-num">—</span>, label: 'Rank' },
                  { icon: TrendingUp, node: <CountUp value={pointsData.currentStreak} />, label: 'Streak' },
                ].map(({ icon: Icon, node, label }) => (
                  <div key={label} className="stat-card">
                    <div className="relative z-10 flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      <span className="micro-label">{label}</span>
                    </div>
                    <p className="stat-value relative z-10 mt-2">{node}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isManager && <RosterGapCounters />}

        {/* Action row — what to do right now */}

        <HomeActionRow />

        {/* Today's car assignment (only when published for today) */}
        <div className="mb-4 space-y-3">
          <MyEventsTodayCard />
          <MyCarTodayCard />
          <MyActionItemsCard />
          <ContinueVerticalSetupCard />
        </div>


        {/* Announcement Box */}
        <AnnouncementBox />

        {/* Mission Board Toggle: To-Do / Funnel Tracker */}
        {isManager && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:inline-flex">
            {[
              { id: 'todo' as const, label: 'Missions', icon: ListTodo },
              { id: 'funnel' as const, label: 'Funnel Tracker', icon: GitBranch },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setDashboardView(id)}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-[13px] font-bold transition-all duration-180',
                  dashboardView === id
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border/40 bg-surface text-muted-foreground hover:border-border/70 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        )}
        {dashboardView === 'todo' || !isManager ? <TodoList /> : <DashboardFunnelTracker />}

        {/* See My Points — glass card */}
        <button
          onClick={() => setShowPoints(true)}
          className="glass-card glass-card-hover group mb-5 flex min-h-14 w-full items-center gap-3 rounded-[var(--radius)] px-4 py-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-primary/15">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[15px] font-bold text-foreground">My Points</span>
          <span className="micro-label ml-auto transition-colors group-hover:text-foreground">View →</span>
        </button>

        {/* ── TODAY'S DASHBOARD ── */}
        {pointsData ? (
          <div className="glass-card mb-5 rounded-[var(--radius)] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius)] bg-primary/15">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="micro-label !text-[11px] !text-foreground">Today</h2>
            </div>

            {/* Daily goal progress bar */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="micro-label">Daily goal</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{hoursToday.toFixed(1)} / {dailyGoalHours}h</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${dailyGoalPercent}%` }} />
              </div>
            </div>

            {/* Daily Challenge */}
            {challengeData && (
              <div className={cn("rounded-xl border p-4", challengeData.all_complete ? "border-success/20 bg-success/5" : "surface-sunken")}>
                <div className="mb-3 flex items-center gap-2">
                  <Target className={cn("h-3.5 w-3.5", challengeData.all_complete ? "text-success" : "text-muted-foreground")} />
                  <span className="micro-label !text-foreground">Daily challenge</span>
                  <span className={cn("ml-auto text-[11px] font-bold tabular-nums",
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
                            <div className={cn("progress-fill", obj.complete && "bg-success")} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {challengeData.all_complete && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-success">
                    <Gift className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">+{challengeData.bonus_points} pts earned</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : pointsLoading ? (
          <div className="glass-card mb-5 space-y-4 rounded-[var(--radius)] p-5 sm:p-6">
            <Skeleton className="h-3 w-28" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="surface-sunken space-y-2.5 p-4">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ) : null}

        {/* Continue Learning */}
        {pointsData && <ContinueLearning data={pointsData} isComplete={trainingComplete} />}

        {/* Onboarding Quest (Rookie only) */}
        {!isManager && <OnboardingQuest />}

        {/* Downline Growth Calculator */}
        {isManager && (
          <Suspense fallback={<Skeleton className="mb-5 h-40 w-full rounded-[var(--radius)]" />}>
            <DownlineGrowthCalculator />
          </Suspense>
        )}
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
