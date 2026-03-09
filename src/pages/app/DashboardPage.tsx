import { useState, useEffect } from 'react';
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
import { TodaysProgress } from '@/components/dashboard/TodaysProgress';
import { ContinueLearning } from '@/components/dashboard/ContinueLearning';
import { DailyMomentum } from '@/components/dashboard/DailyMomentum';
import { DailyChallenge } from '@/components/dashboard/DailyChallenge';
import { NextPointOpportunity } from '@/components/dashboard/NextPointOpportunity';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { OnboardingAlert } from '@/components/dashboard/OnboardingAlert';
import { MyPointsDashboard } from '@/components/points/MyPointsDashboard';
import { PointSystemModal } from '@/components/points/PointSystemModal';
import { Trophy, Info, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role, profile, user, isLoading } = useAuth();
  const { streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, newMilestone, clearMilestone } = useStreak();
  const { data: pointsData, isLoading: pointsLoading } = useMyPoints();
  const [showPoints, setShowPoints] = useState(false);
  const [showPointSystem, setShowPointSystem] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);

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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <OnboardingAlert />

        {/* Point system banner */}
        <button
          onClick={() => setShowPointSystem(true)}
          className="w-full mb-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-left flex items-center gap-2 hover:bg-yellow-500/15 transition-colors"
        >
          <Info className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-200/80 font-medium">Point system revised — hours logged is now #1. <span className="underline">See details</span></span>
        </button>

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

        {/* See My Points button */}
        <button
          onClick={() => setShowPoints(true)}
          className="w-full mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 flex items-center gap-2.5 hover:from-primary/15 hover:to-primary/10 transition-all"
        >
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">See My Points</span>
          <span className="text-xs text-muted-foreground ml-auto">Breakdown + Caps →</span>
        </button>

        {/* SECTION 1 — Today's Progress */}
        {pointsData && <TodaysProgress data={pointsData} />}

        {/* SECTION 3 — Daily Momentum */}
        {pointsData && <DailyMomentum hoursToday={pointsData.timeTodayMinutes / 60} />}

        {/* SECTION 2 — Continue Learning */}
        {pointsData && <ContinueLearning data={pointsData} isComplete={trainingComplete} />}

        {/* Training complete state */}
        {trainingComplete && (
          <div className="mb-4 bg-card rounded-xl border border-success/30 p-5 text-center">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <h3 className="text-lg font-bold text-foreground">You're Fully Certified.</h3>
            <p className="text-xs text-muted-foreground mt-1">All training complete. Keep pushing.</p>
          </div>
        )}

        {/* Next Point Opportunity */}
        {pointsData && <NextPointOpportunity data={pointsData} />}

        {/* Quick Actions */}
        <QuickActions />

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
