import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  total_points: number;
  training_points: number;
  current_streak: number;
  lessons_completed: number;
  rank: number;
}

export function WeeklyLeaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.rpc('get_current_leaderboard');

        if (error) {
          console.error('Leaderboard RPC error:', error);
          setLeaderboard([]);
          setIsLoading(false);
          return;
        }

        // Server returns deterministic order — just map and take top 20
        const entries: LeaderboardEntry[] = (data || [])
          .filter((row: any) => (row.total_points || 0) > 0)
          .slice(0, 20)
          .map((row: any) => ({
            user_id: row.user_id,
            full_name: row.full_name,
            nickname: row.nickname,
            avatar_url: row.avatar_url,
            total_points: row.total_points || 0,
            training_points: row.training_points || 0,
            current_streak: row.current_streak || 0,
            lessons_completed: Number(row.lessons_completed) || 0,
            rank: Number(row.rank) || 0,
          }));

        setLeaderboard(entries);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();

    // Auto-refresh every 30 seconds — no stale data
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-center text-sm font-medium text-muted-foreground">{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading leaderboard...</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <TrendingUp className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No activity this week</p>
        <p className="text-sm text-muted-foreground/70">Complete training to earn points!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2">
      {leaderboard.map((entry) => {
        const isCurrentUser = entry.user_id === user?.id;
        const displayLabel = entry.nickname || entry.full_name?.split(' ')[0] || 'Unknown';

        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
              isCurrentUser
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-card/50 hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-center w-8">
              {getRankIcon(entry.rank)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium text-sm ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                  {displayLabel}
                </span>
                {isCurrentUser && (
                  <span className="text-xs text-primary">(You)</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span>🎓 {entry.training_points}</span>
                <span>📚 {entry.lessons_completed}</span>
                <span>🔥 {entry.current_streak}d</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-primary">{entry.total_points}</div>
              <div className="text-xs text-muted-foreground">pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
