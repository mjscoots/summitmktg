import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { WeeklyLeaderboard } from '@/components/dashboard/WeeklyLeaderboard';
import { Bell, Calendar, GraduationCap, Trophy, Users } from 'lucide-react';

export default function ManagerDashboardPage() {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect rookies to their dashboard
  useEffect(() => {
    if (!isLoading && role === 'rookie') {
      navigate('/app/rookie', { replace: true });
    }
  }, [role, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider initialRole="manager">
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Dashboard Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              MANAGER <span className="text-primary">DASHBOARD</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Lead your team to the summit
            </p>
          </div>

          {/* Top Row: Announcements + Weekly Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Announcements Panel */}
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Announcements</h2>
              </div>
              <AnnouncementsFeed />
            </div>

            {/* Weekly Calendar */}
            <div className="bg-card rounded-lg border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Weekly Calendar</h2>
              </div>
              <WeeklySchedule />
            </div>
          </div>

          {/* Training Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground text-lg">Training</h2>
              <span className="text-xs text-muted-foreground ml-2">
                (Includes Manager-only content)
              </span>
            </div>
            <TrainingTiles />
          </div>

          {/* Weekly Leaderboard */}
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Weekly Leaderboard</h2>
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                <Users className="w-3 h-3" />
                All Team Members
              </span>
            </div>
            <WeeklyLeaderboard />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
