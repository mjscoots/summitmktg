import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPoints } from '@/hooks/useMyPoints';
import { AppLayout } from '@/components/layout/AppLayout';
import { StreakCelebration } from '@/components/training/StreakCelebration';
import { useStreak } from '@/hooks/useStreak';
import { CommandCenterHeader } from '@/components/dashboard/CommandCenterHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { OnboardingQuest } from '@/components/dashboard/OnboardingQuest';
import { ContinueLearning } from '@/components/dashboard/ContinueLearning';
import { TodoList } from '@/components/dashboard/TodoList';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { OnboardingAlert } from '@/components/dashboard/OnboardingAlert';
import { MyPointsDashboard } from '@/components/points/MyPointsDashboard';
import { PointSystemModal } from '@/components/points/PointSystemModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, CheckCircle, Clock, Flame, MessageSquare, Target, BookOpen, Gift, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      {/* Quick actions skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      {/* Task card skeleton */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
      {/* Dashboard card skeleton */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg p-3 space-y-2">
              <Skeleton className="h-3 w-8 mx-auto" />
              <Skeleton className="h-6 w-10 mx-auto" />
              <Skeleton className="h-2 w-6 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role, profile, user, isLoading } = useAuth();
  const { streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, newMilestone, clearMilestone } = useStreak();
  const { data: pointsData, isLoading: pointsLoading } = useMyPoints();
  const [showPoints, setShowPoints] = useState(false);
  const [showPointSystem, setShowPointSystem] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [challengeData, setChallengeData] = useState<any>(null);
  const [chatMsgCount, setChatMsgCount] = useState(0);

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

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

  // Fetch today's chat message count
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
    fetchChatCount();
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
      <div className="max-w-5xl mx-auto px-4 py-4 animate-fade-in">
        <OnboardingAlert />

        {isManager ? (
          <CommandCenterHeader />
        ) : (
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">
                What's up, {firstName}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete training. Build momentum.
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <QuickActions />

        {/* To-Do List */}
        <TodoList />

        {/* See My Points — compact card */}
        <button
          onClick={() => setShowPoints(true)}
          className="w-full mb-4 px-4 py-2.5 rounded-xl bg-card border border-border flex items-center gap-2.5 hover:border-primary/30 transition-all group"
        >
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">My Points</span>
          <span className="text-xs text-muted-foreground ml-auto group-hover:text-foreground transition-colors">View →</span>
        </button>

        {/* ── TODAY'S DASHBOARD ── */}
        {pointsData ? (
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Today</h2>
              <span className={cn("ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full",
                hoursToday < 1 ? "bg-muted text-muted-foreground" :
                hoursToday < 2 ? "bg-blue-500/10 text-blue-400" :
                hoursToday < 4 ? "bg-orange-500/10 text-orange-400" :
                "bg-yellow-500/10 text-yellow-400"
              )}>
                {momentumLevel}
              </span>
            </div>

            {/* Stats row — minimal */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[
                { icon: Clock, value: hoursToday.toFixed(1), label: 'Hrs', color: 'text-primary' },
                { icon: Trophy, value: dailyPointsEarned, label: 'Pts', color: 'text-yellow-400' },
                { icon: MessageSquare, value: chatMsgCount, label: 'Msgs', color: 'text-blue-400' },
                { icon: Flame, value: pointsData.currentStreak, label: 'Streak', color: 'text-orange-400' },
              ].map(({ icon: Icon, value, label, color }) => (
                <div key={label} className="rounded-lg bg-muted/20 p-2 text-center">
                  <Icon className={cn("w-3 h-3 mx-auto mb-0.5", color)} />
                  <p className="text-base font-bold text-foreground tabular-nums leading-tight">{value}</p>
                  <p className="text-[8px] text-muted-foreground uppercase font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* Elite bar — slimmer */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Elite Goal</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{hoursToday.toFixed(1)}/{eliteGoal}h</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    elitePercent === 100
                      ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                      : "bg-primary"
                  )}
                  style={{ width: `${elitePercent}%` }}
                />
              </div>
            </div>

            {/* Daily Challenge — minimal */}
            {challengeData && (
              <div className={cn("p-3 rounded-lg", challengeData.all_complete ? "bg-success/5" : "bg-muted/10")}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className={cn("w-3.5 h-3.5", challengeData.all_complete ? "text-success" : "text-muted-foreground")} />
                  <span className="text-xs font-semibold text-foreground">Daily Challenge</span>
                  <span className={cn("ml-auto text-[10px] font-medium",
                    challengeData.all_complete ? "text-success" : "text-muted-foreground"
                  )}>{challengeCompleted}/{challengeTotal}</span>
                </div>
                <div className="space-y-1.5">
                  {challengeData.objectives?.map((obj: any) => {
                    const Icon = OBJECTIVE_ICONS[obj.type] || Target;
                    const color = OBJECTIVE_COLORS[obj.type] || 'text-primary';
                    const percent = Math.min((obj.current / obj.target) * 100, 100);
                    return (
                      <div key={obj.type} className="flex items-center gap-2">
                        <div className={cn("shrink-0", obj.complete ? "text-success" : color)}>
                          {obj.complete ? <CheckCircle className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[11px]", obj.complete ? "text-success line-through" : "text-foreground")}>{obj.label}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {obj.type === 'training' ? `${Math.round(obj.current)}/${obj.target}m` : `${obj.current}/${obj.target}`}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                            <div className={cn("h-full rounded-full transition-all", obj.complete ? "bg-success" : "bg-primary")} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {challengeData.all_complete && (
                  <div className="mt-2 flex items-center gap-1.5 text-success">
                    <Gift className="w-3 h-3" />
                    <span className="text-[10px] font-medium">+{challengeData.bonus_points} pts earned!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : pointsLoading ? (
          <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-muted/20 p-2 space-y-1.5">
                  <Skeleton className="h-3 w-3 mx-auto" />
                  <Skeleton className="h-5 w-8 mx-auto" />
                  <Skeleton className="h-2 w-6 mx-auto" />
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
