import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPoints } from '@/hooks/useMyPoints';
import { AppLayout } from '@/components/layout/AppLayout';
import { StreakDisplay } from '@/components/training/StreakDisplay';
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
import { Trophy, CheckCircle, Clock, Flame, MessageSquare, Target, BookOpen, Gift, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
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
      <div className="max-w-5xl mx-auto px-4 py-6">
        <OnboardingAlert />

        {isManager ? (
          <CommandCenterHeader />
        ) : (
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                What's up, {firstName}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Complete training. Build momentum.
              </p>
            </div>
            <StreakDisplay variant="compact" clickable />
          </div>
        )}

        {/* Quick Actions — moved to top */}
        <QuickActions />

        {/* To-Do List */}
        <TodoList />

        {/* See My Points button */}
        <button
          onClick={() => setShowPoints(true)}
          className="w-full mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 flex items-center gap-2.5 hover:from-primary/15 hover:to-primary/10 transition-all"
        >
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">See My Points</span>
          <span className="text-xs text-muted-foreground ml-auto">Breakdown + Caps →</span>
        </button>

        {/* ── UNIFIED TODAY'S DASHBOARD ── */}
        {pointsData && (
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Today's Dashboard</h2>
              <span className={cn("ml-auto text-xs font-bold px-2 py-0.5 rounded-full",
                hoursToday < 1 ? "bg-muted text-muted-foreground" :
                hoursToday < 2 ? "bg-blue-500/15 text-blue-400" :
                hoursToday < 4 ? "bg-orange-500/15 text-orange-400" :
                "bg-yellow-500/15 text-yellow-400"
              )}>
                {momentumLevel}
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <Clock className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                <p className="text-lg font-black text-foreground tabular-nums">{hoursToday.toFixed(1)}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-medium">Hrs</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <Trophy className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-0.5" />
                <p className="text-lg font-black text-foreground tabular-nums">{dailyPointsEarned}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-medium">Pts</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
                <p className="text-lg font-black text-foreground tabular-nums">{pointsData.capsToday.chat.earned}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-medium">Chat</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <Flame className="w-3.5 h-3.5 text-orange-400 mx-auto mb-0.5" />
                <p className="text-lg font-black text-foreground tabular-nums">{pointsData.currentStreak}</p>
                <p className="text-[9px] text-muted-foreground uppercase font-medium">Streak</p>
              </div>
            </div>

            {/* Elite Training Goal bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-foreground">Elite Training Goal</span>
                <span className="text-xs text-muted-foreground tabular-nums">{hoursToday.toFixed(1)} / {eliteGoal} hrs</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
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

            {/* Daily Challenge inline */}
            {challengeData && (
              <div className={cn("p-3 rounded-lg border", challengeData.all_complete ? "border-success/30 bg-success/5" : "border-border/30 bg-muted/20")}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className={cn("w-3.5 h-3.5", challengeData.all_complete ? "text-success" : "text-primary")} />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">Daily Challenge</span>
                  <span className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    challengeData.all_complete ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
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
                          {obj.complete ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[11px] font-medium", obj.complete ? "text-success line-through" : "text-foreground")}>{obj.label}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {obj.type === 'training' ? `${Math.round(obj.current)}/${obj.target} min` : `${obj.current}/${obj.target}`}
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
                <div className={cn("mt-2 flex items-center gap-1.5", challengeData.all_complete ? "text-success" : "text-muted-foreground")}>
                  <Gift className="w-3 h-3" />
                  <span className="text-[10px] font-medium">
                    {challengeData.all_complete ? `+${challengeData.bonus_points} pts earned!` : `Complete all for +${challengeData.bonus_points} pts`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

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
