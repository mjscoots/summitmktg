import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRookieView } from '@/contexts/RookieViewContext';
import { useStreak } from '@/hooks/useStreak';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { WeeklyLeaderboard } from '@/components/dashboard/WeeklyLeaderboard';
import { RookieXPPanel } from '@/components/dashboard/RookieXPPanel';
import { StreakCelebration } from '@/components/training/StreakCelebration';
import { StreakDisplay } from '@/components/training/StreakDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Calendar, GraduationCap, Trophy, Sparkles } from 'lucide-react';

function RookieSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function RookieDashboardPage() {
  const { role, isLoading, profile } = useAuth();
  const { isImpersonating } = useRookieView();
  const { streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, newMilestone, clearMilestone } = useStreak();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isImpersonating && (role === 'manager' || role === 'admin' || role === 'owner')) {
      navigate('/app/manager', { replace: true });
    }
  }, [role, isLoading, isImpersonating, navigate]);

  if (isLoading) return <RookieSkeleton />;

  const firstName = profile?.full_name?.split(' ')[0] || 'Rookie';

  return (
    <ThemeProvider initialRole="rookie">
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Welcome — compact */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                LET'S GO, <span className="text-primary">{firstName.toUpperCase()}</span>
              </h1>
            </div>
            <p className="text-muted-foreground text-xs mb-3">
              Earn XP by completing lessons, passing quizzes, and keeping your streak alive.
            </p>
            <RookieXPPanel />
            <div className="mt-3 max-w-sm">
              <StreakDisplay variant="compact" clickable />
            </div>
          </div>

          {/* Training */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Training</h2>
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                +25 XP / LESSON
              </span>
            </div>
            <TrainingTiles />
          </div>

          {/* Announcements + Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Announcements</h2>
              </div>
              <AnnouncementsFeed />
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Weekly Calendar</h2>
              </div>
              <WeeklySchedule />
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Weekly Leaderboard</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">Rookies Only</span>
            </div>
            <WeeklyLeaderboard />
          </div>
        </main>

        {showStreakCelebration && streakData.currentStreak > 0 && (
          <StreakCelebration
            streak={streakData.currentStreak}
            milestone={newMilestone}
            message={getStreakMessage()}
            onComplete={() => { clearStreakCelebration(); clearMilestone(); }}
          />
        )}
      </div>
    </ThemeProvider>
  );
}
