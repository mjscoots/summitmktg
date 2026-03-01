import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { DailyChecklist } from '@/components/dashboard/DailyChecklist';
import { StreakDisplay } from '@/components/training/StreakDisplay';
import { StreakCelebration } from '@/components/training/StreakCelebration';
import { useStreak } from '@/hooks/useStreak';
import { CommandCenterHeader } from '@/components/dashboard/CommandCenterHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { OneOnOneTasks } from '@/components/dashboard/OneOnOneTasks';
import { OnboardingQuest } from '@/components/dashboard/OnboardingQuest';
import { ResumeTrainingCard } from '@/components/dashboard/ResumeTrainingCard';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { OnboardingAlert } from '@/components/dashboard/OnboardingAlert';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role, profile, isLoading } = useAuth();
  const { streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, newMilestone, clearMilestone } = useStreak();

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

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

        {/* Quick Actions */}
        <QuickActions />

        {/* Resume Training Card */}
        <ResumeTrainingCard />

        {/* Today's Checklist (max 2 items) */}
        <DailyChecklist />

        {/* Onboarding Quest (Rookie only) */}
        {!isManager && <OnboardingQuest />}

        {/* Tasks from Weekly 1:1 (for rookies) */}
        {!isManager && (
          <Card className="mb-4">
            <div className="p-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">From Your 1:1</h2>
              </div>
            </div>
            <OneOnOneTasks />
          </Card>
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
    </AppLayout>
  );
}
