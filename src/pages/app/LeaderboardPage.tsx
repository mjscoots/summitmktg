import { AppLayout } from '@/components/layout/AppLayout';
import { WeeklyLeaderboard } from '@/components/dashboard/WeeklyLeaderboard';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-green-400" />
            Rookie Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            See how you stack up against other rookies
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <WeeklyLeaderboard />
        </div>
      </main>
    </AppLayout>
  );
}
