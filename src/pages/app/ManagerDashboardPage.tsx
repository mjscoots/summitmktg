import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { WeeklyLeaderboard } from '@/components/dashboard/WeeklyLeaderboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Calendar, GraduationCap, Trophy, Users, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

function ManagerSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-3">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function ManagerDashboardPage() {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && role === 'rookie') {
      navigate('/app/rookie', { replace: true });
    }
  }, [role, isLoading, navigate]);

  if (isLoading) {
    return <ManagerSkeleton />;
  }

  return (
    <ThemeProvider initialRole="manager">
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Manager <span className="text-primary">Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Lead your team to the summit</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg text-foreground">Training</h2>
              </div>
              <Link
                to="/app/admin/videos"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Video className="w-3.5 h-3.5" />
                Manage Videos
              </Link>
            </div>
            <TrainingTiles />
          </div>

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

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Weekly Leaderboard</h2>
              <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                <Users className="w-3 h-3" />
                All Members
              </span>
            </div>
            <WeeklyLeaderboard />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
