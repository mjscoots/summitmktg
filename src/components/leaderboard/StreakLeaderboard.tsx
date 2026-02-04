import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  streak: number;
}

export function StreakLeaderboard() {
  const { user } = useAuth();
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

        // Get profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', rookieIds)
          .not('status', 'eq', 'nlc');

        // Get lesson progress to calculate streaks
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('user_id, completed_at')
          .in('user_id', rookieIds)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        // Calculate streak per user (consecutive days with completions)
        const streakMap = new Map<string, number>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        rookieIds.forEach(userId => {
          const userProgress = progress?.filter(p => p.user_id === userId) || [];
          
          if (userProgress.length === 0) {
            streakMap.set(userId, 0);
            return;
          }

          // Get unique dates
          const dates = [...new Set(userProgress.map(p => {
            const d = new Date(p.completed_at!);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          }))].sort((a, b) => b - a);

          // Check for consecutive days starting from today or yesterday
          let streak = 0;
          const oneDayMs = 24 * 60 * 60 * 1000;
          const todayTime = today.getTime();
          const yesterdayTime = todayTime - oneDayMs;

          // Start counting if there's activity today or yesterday
          if (dates[0] === todayTime || dates[0] === yesterdayTime) {
            streak = 1;
            for (let i = 1; i < dates.length; i++) {
              if (dates[i - 1] - dates[i] === oneDayMs) {
                streak++;
              } else {
                break;
              }
            }
          }

          streakMap.set(userId, streak);
        });

        const leaderboard: StreakEntry[] = (profiles || [])
          .map(p => ({
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            streak: streakMap.get(p.user_id) || 0,
          }))
          .filter(e => e.streak > 0)
          .sort((a, b) => b.streak - a.streak);

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
      <div className="p-8 text-center">
        <Flame className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No active streaks</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {entries.map((entry, index) => {
        const isCurrentUser = entry.user_id === user?.id;
        const rank = index + 1;

        return (
          <div
            key={entry.user_id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors",
              isCurrentUser && "bg-primary/5"
            )}
          >
            <div className="w-6 flex justify-center">{getRankIcon(rank)}</div>
            
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  {entry.full_name.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isCurrentUser ? "text-primary" : "text-foreground"
              )}>
                {entry.full_name}
                {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <Flame className={cn(
                "w-4 h-4",
                entry.streak >= 7 ? "text-orange-500" : "text-orange-400/70"
              )} />
              <span className="text-lg font-bold text-foreground">{entry.streak}</span>
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}