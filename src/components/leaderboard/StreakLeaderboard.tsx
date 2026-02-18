import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useNavigate } from 'react-router-dom';

interface StreakEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  streak: number;
  longest_streak: number;
  total_days: number;
}

export function StreakLeaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<StreakEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get all rookies
        const { data: rookieRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'rookie');

        if (!rookieRoles || rookieRoles.length === 0) {
          setEntries([]);
          setIsLoading(false);
          return;
        }

        const rookieIds = rookieRoles.map(r => r.user_id);

        // Fetch streaks and profiles in parallel
        const [streaksRes, profilesRes] = await Promise.all([
          supabase
            .from('daily_login_streaks')
            .select('user_id, current_streak, longest_streak, total_days_active')
            .in('user_id', rookieIds)
            .gt('current_streak', 0),
          supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', rookieIds)
            .not('status', 'eq', 'nlc'),
        ]);

        const profileMap = new Map(
          (profilesRes.data || []).map(p => [p.user_id, p])
        );

        const leaderboard: StreakEntry[] = (streaksRes.data || [])
          .map(s => {
            const profile = profileMap.get(s.user_id);
            if (!profile) return null;
            return {
              user_id: s.user_id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              streak: s.current_streak,
              longest_streak: s.longest_streak,
              total_days: s.total_days_active,
            };
          })
          .filter(Boolean) as StreakEntry[];

        leaderboard.sort((a, b) => b.streak - a.streak);
        setEntries(leaderboard.slice(0, 20));
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 text-amber-600" />;
      default: return <span className="text-xs font-medium text-muted-foreground w-4 text-center">{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center bg-gradient-to-b from-orange-500/5 to-transparent rounded-xl">
        <Flame className="w-12 h-12 text-orange-400/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No active streaks yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Log in daily to build your streak!</p>
        <div className="mt-3 text-[10px] text-muted-foreground/60 space-y-0.5">
          <p>3 days = +50 bonus pts</p>
          <p>7 days = +150 bonus pts</p>
          <p>14 days = +300 bonus pts</p>
          <p>30 days = +1000 bonus pts</p>
        </div>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-4">
      {/* Bonus schedule banner */}
      <div className="mx-4 mt-4 p-2.5 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/15">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center flex-wrap">
          <span className="font-semibold text-orange-400">Daily Login Bonus:</span>
          <span>+10 pts/day</span>
          <span>·</span>
          <span>3d = +50</span>
          <span>·</span>
          <span>7d = +150</span>
          <span>·</span>
          <span>14d = +300</span>
          <span>·</span>
          <span>30d = +1000</span>
        </div>
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4">
          {top3.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.user_id === user?.id;
            const bgClass = rank === 1
              ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/5 border-amber-500/30'
              : rank === 2
                ? 'bg-gradient-to-b from-slate-400/20 to-slate-400/5 border-slate-400/30'
                : 'bg-gradient-to-b from-orange-600/20 to-orange-600/5 border-orange-600/30';

            return (
              <button
                key={entry.user_id}
                onClick={() => navigate('/app/team')}
                className={cn(
                  "flex flex-col items-center p-3 rounded-xl border transition-all hover:scale-[1.02]",
                  bgClass,
                  isCurrentUser && "ring-2 ring-primary/50"
                )}
              >
                <div className="mb-1">{getRankIcon(rank)}</div>
                <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="md" className="mb-1.5" />
                <p className={cn(
                  "text-xs font-medium text-center truncate w-full",
                  isCurrentUser ? "text-primary" : "text-foreground"
                )}>
                  {entry.full_name.split(' ')[0]}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-lg font-bold text-orange-500">{entry.streak}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">Best: {entry.longest_streak}d</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="divide-y divide-border/50 border-t border-border/30">
          {rest.map((entry, index) => {
            const isCurrentUser = entry.user_id === user?.id;
            const rank = index + 4;

            return (
              <button
                key={entry.user_id}
                onClick={() => navigate('/app/team')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 text-left",
                  isCurrentUser && "bg-primary/5"
                )}
              >
                <div className="w-6 flex justify-center">
                  <span className="text-xs font-medium text-muted-foreground">{rank}</span>
                </div>
                <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isCurrentUser ? "text-primary" : "text-foreground"
                  )}>
                    {entry.full_name.split(' ').slice(0, 2).join(' ')}
                    {isCurrentUser && <span className="text-xs ml-1 text-muted-foreground">(You)</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Best: {entry.longest_streak}d · {entry.total_days} total</p>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className={cn(
                    "w-3.5 h-3.5",
                    entry.streak >= 7 ? "text-orange-500" : "text-orange-400/70"
                  )} />
                  <span className="text-sm font-bold text-foreground">{entry.streak}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
