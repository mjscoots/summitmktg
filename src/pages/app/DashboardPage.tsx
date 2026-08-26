import { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRookieView } from '@/contexts/RookieViewContext';
import { useMyPoints } from '@/hooks/useMyPoints';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnnouncementBox } from '@/components/dashboard/AnnouncementBox';
import { HomeActionRow } from '@/components/dashboard/HomeActionRow';
import { HomeQuickCards } from '@/components/dashboard/HomeQuickCards';
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
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useBootcamp } from '@/hooks/useBootcamp';
import { WorkspaceHome } from '@/components/workspace/WorkspaceHome';
import { FiberHome } from '@/components/workspace/FiberHome';
import { LifeHome } from '@/components/workspace/LifeHome';

import { WinterPlanCard } from '@/components/workspace/WinterPlanCard';
import { HomeQuestionCard } from '@/components/home/HomeQuestionCard';

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
  const { active } = useWorkspace();
  const { isLocked: bootcampLocked } = useBootcamp();
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

  // Non-pest workspaces get their own home; pest keeps this one.
  if (active && active.vertical !== 'Pest') {
    return (
      <AppLayout>
        {active.vertical === 'Fiber' && active.status === 'active' ? (
          <FiberHome workspace={active} />
        ) : active.vertical === 'Life' ? (
          <LifeHome workspace={active} />
        ) : (
          <WorkspaceHome workspace={active} />
        )}
      </AppLayout>
    );
  }


  // The Summer Checklist gate applies to the Pest workspace home only.
  if (bootcampLocked) {
    return <Navigate to="/summer-checklist" replace />;
  }




  return (
    <AppLayout>
      <PestHome isManager={isManager} onOpenPoints={() => setShowPoints(true)} />


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
