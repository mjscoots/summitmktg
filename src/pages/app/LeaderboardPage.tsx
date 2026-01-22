import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { WeeklyLeaderboard } from '@/components/dashboard/WeeklyLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';

  return (
    <ThemeProvider initialRole={isManager ? 'manager' : 'rookie'}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">
              {isManager ? 'View all team members' : 'See how you stack up against other rookies'}
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <WeeklyLeaderboard />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
