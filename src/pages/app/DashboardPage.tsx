import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { StreakCelebration } from '@/components/training/StreakCelebration';
import { useStreak } from '@/hooks/useStreak';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { MyPointsDashboard } from '@/components/points/MyPointsDashboard';
import { PointSystemModal } from '@/components/points/PointSystemModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useBootcamp } from '@/hooks/useBootcamp';
import { WorkspaceHome } from '@/components/workspace/WorkspaceHome';
import { FiberHome } from '@/components/workspace/FiberHome';
import { LifeHome } from '@/components/workspace/LifeHome';
import { PestHome } from '@/components/workspace/PestHome';


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
  const { isLoading } = useAuth();
  const { active } = useWorkspace();
  const { isLocked: bootcampLocked } = useBootcamp();
  const { streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, newMilestone, clearMilestone } = useStreak();
  const [showPoints, setShowPoints] = useState(false);
  const [showPointSystem, setShowPointSystem] = useState(false);



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
      <PestHome onOpenPoints={() => setShowPoints(true)} />


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
