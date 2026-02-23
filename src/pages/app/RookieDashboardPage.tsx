import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRookieView } from '@/contexts/RookieViewContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { WeeklyLeaderboard } from '@/components/dashboard/WeeklyLeaderboard';
import { AICoachChat } from '@/components/dashboard/AICoachChat';
import { RookieXPPanel } from '@/components/dashboard/RookieXPPanel';
import { Bell, Calendar, GraduationCap, Trophy, Sparkles } from 'lucide-react';

export default function RookieDashboardPage() {
  const { role, isLoading, profile } = useAuth();
  const { isImpersonating } = useRookieView();
  const navigate = useNavigate();

  // Redirect managers to their dashboard (unless impersonating)
  useEffect(() => {
    if (!isLoading && !isImpersonating && (role === 'manager' || role === 'admin')) {
      navigate('/app/manager', { replace: true });
    }
  }, [role, isLoading, isImpersonating, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Rookie';

  return (
    <ThemeProvider initialRole="rookie">
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Welcome + XP Panel */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                LET'S GO, <span className="text-primary">{firstName.toUpperCase()}</span>
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Earn XP by completing lessons, passing quizzes, and keeping your streak alive.
            </p>
            <RookieXPPanel />
          </div>

          {/* TRAINING FIRST - Most Important Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-primary/15 rounded-lg">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-bold text-xl text-foreground">Training</h2>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                +25 XP / LESSON
              </span>
            </div>
            <TrainingTiles />
          </div>

          {/* Top Row: Announcements + Weekly Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Announcements Panel */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Announcements</h2>
              </div>
              <AnnouncementsFeed />
            </div>

            {/* Weekly Calendar */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Weekly Calendar</h2>
              </div>
              <WeeklySchedule />
            </div>
          </div>

          {/* Weekly Leaderboard */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Weekly Leaderboard</h2>
              <span className="text-xs text-muted-foreground ml-auto">Rookies Only</span>
            </div>
            <WeeklyLeaderboard />
          </div>
        </main>

        {/* AI Coach Chat */}
        <AICoachChat />
      </div>
    </ThemeProvider>
  );
}
