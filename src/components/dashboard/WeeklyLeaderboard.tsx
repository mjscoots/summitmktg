import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, TrendingUp, Flame, BookOpen, Video, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  team_name: string | null;
  total_points: number;
  training_points: number;
  current_streak: number;
  lessons_completed: number;
  videos_watched: number;
  time_this_week_minutes: number;
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

        const entries: LeaderboardEntry[] = (data || [])
          .filter((row: any) => (row.total_points || 0) > 0)
          .slice(0, 20)
          .map((row: any) => ({
            user_id: row.user_id,
            full_name: row.full_name,
            nickname: row.nickname,
            avatar_url: row.avatar_url,
            team_name: row.team_name || null,
            total_points: row.total_points || 0,
            training_points: row.training_points || 0,
            current_streak: row.current_streak || 0,
            lessons_completed: Number(row.lessons_completed) || 0,
            videos_watched: Number(row.videos_watched) || 0,
            time_this_week_minutes: row.time_this_week_minutes || 0,
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
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground tabular-nums">#{rank}</span>;
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
    <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
      {leaderboard.map((entry) => {
        const isCurrentUser = entry.user_id === user?.id;
        const displayLabel = entry.nickname || entry.full_name?.split(' ')[0] || 'Unknown';
        const hoursLogged = Math.floor(entry.time_this_week_minutes / 60);
        const minsRemainder = entry.time_this_week_minutes % 60;

        return (
          <div
            key={entry.user_id}
            className={cn(
              "p-3 rounded-xl border transition-all",
              isCurrentUser
                ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                : "border-border/50 bg-card/50 hover:border-border/80"
            )}
          >
            {/* Top row: rank, name, points */}
            <div className="flex items-center gap-3">
              <div className="w-8 flex items-center justify-center shrink-0">
                {getRankDisplay(entry.rank)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "font-semibold text-sm truncate",
                    isCurrentUser ? "text-primary" : "text-foreground"
                  )}>
                    {displayLabel}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[10px] font-medium text-primary/70">(You)</span>
                  )}
                </div>
                {entry.team_name && (
                  <p className="text-[10px] text-muted-foreground/60 truncate">{entry.team_name}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="text-lg font-black text-primary tabular-nums">{entry.total_points}</div>
                <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">pts</div>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-2 ml-11 flex-wrap">
              {entry.current_streak > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Flame className={cn("w-3 h-3", entry.current_streak >= 7 ? "text-orange-500" : "text-orange-400/70")} />
                  {entry.current_streak}d
                </span>
              )}
              {entry.lessons_completed > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <BookOpen className="w-3 h-3 text-primary/60" />
                  {entry.lessons_completed}
                </span>
              )}
              {entry.videos_watched > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Video className="w-3 h-3 text-primary/60" />
                  {entry.videos_watched}
                </span>
              )}
              {entry.time_this_week_minutes > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3 text-primary/60" />
                  {hoursLogged > 0 ? `${hoursLogged}h` : ''}{minsRemainder > 0 ? `${minsRemainder}m` : hoursLogged > 0 ? '' : '0m'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
