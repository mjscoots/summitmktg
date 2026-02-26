import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Trophy, Shield, Award, Star, Mountain } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  name: string;
  nickname: string | null;
  globalPercent: number;
  completedCount: number;
  badges: string[];
}

function displayName(entry: LeaderboardEntry) {
  return entry.nickname || entry.name.split(' ')[0];
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  bronze: <Shield className="w-3.5 h-3.5 text-amber-600" />,
  silver: <Award className="w-3.5 h-3.5 text-slate-300" />,
  gold: <Star className="w-3.5 h-3.5 text-yellow-400" />,
  summit: <Mountain className="w-3.5 h-3.5 text-primary" />,
};

export function TrainingLeaderboardPanel() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user?.id) return;

      try {
        // Use server-side SECURITY DEFINER function — deterministic, bypasses RLS
        const { data, error } = await supabase.rpc('get_training_leaderboard_panel', { _limit: 20 });

        if (error) {
          console.error('Training leaderboard panel RPC error:', error);
          setIsLoading(false);
          return;
        }

        // Map server response — NO re-sorting, server order is authoritative
        const leaderboard: LeaderboardEntry[] = (data || []).map((row: any) => ({
          userId: row.user_id,
          name: row.full_name,
          nickname: row.nickname || null,
          globalPercent: row.global_percent || 0,
          completedCount: row.completed_count || 0,
          badges: row.badges || [],
        }));

        setEntries(leaderboard);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user?.id]);

  if (isLoading) {
    return <div className="bg-card rounded-xl border border-border p-5 animate-pulse h-40" />;
  }

  if (entries.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Training Leaderboard</h2>
      </div>

      <div className="space-y-2">
        {entries.map((entry, idx) => {
          const isCurrentUser = entry.userId === user?.id;
          const rank = idx + 1;
          return (
            <div
              key={entry.userId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                isCurrentUser
                  ? "bg-primary/10 border-primary/30"
                  : "bg-muted/20 border-border/30"
              )}
            >
              {/* Rank */}
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                rank === 1 ? "bg-yellow-400/20 text-yellow-400" :
                rank === 2 ? "bg-slate-300/20 text-slate-300" :
                rank === 3 ? "bg-amber-600/20 text-amber-600" :
                "bg-muted text-muted-foreground"
              )}>
                {rank}
              </span>

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-semibold truncate",
                    isCurrentUser ? "text-primary" : "text-foreground"
                  )}>
                    {displayName(entry)}
                    {isCurrentUser && <span className="text-xs font-normal text-muted-foreground ml-1">(You)</span>}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {entry.badges.map(b => (
                      <span key={b}>{BADGE_ICONS[b]}</span>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {entry.completedCount} lessons completed
                </span>
              </div>

              {/* Progress */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  entry.globalPercent === 100 ? "text-success" : "text-primary"
                )}>
                  {entry.globalPercent}%
                </span>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      entry.globalPercent === 100 ? "bg-success" : "bg-primary"
                    )}
                    style={{ width: `${entry.globalPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
