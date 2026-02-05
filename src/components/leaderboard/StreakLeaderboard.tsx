import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, Flame, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
 import { UserAvatar } from '@/components/shared/UserAvatar';
 import { useNavigate } from 'react-router-dom';

interface StreakEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  streak: number;
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
      <div className="p-8 text-center bg-gradient-to-b from-orange-500/5 to-transparent rounded-xl">
        <Flame className="w-12 h-12 text-orange-400/50 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No active streaks yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Complete training to start your streak!</p>
      </div>
    );
  }

  // Top 3 get special treatment
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-4">
      {/* Top 3 - Featured Display */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 pt-4">
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
                <UserAvatar 
                  avatarUrl={entry.avatar_url} 
                  fullName={entry.full_name} 
                  size="md" 
                  className="mb-1.5"
                />
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
              </button>
            );
          })}
        </div>
      )}

      {/* Rest of leaderboard */}
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
                
                <UserAvatar 
                  avatarUrl={entry.avatar_url} 
                  fullName={entry.full_name} 
                  size="sm" 
                />

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isCurrentUser ? "text-primary" : "text-foreground"
                  )}>
                    {entry.full_name.split(' ').slice(0, 2).join(' ')}
                    {isCurrentUser && <span className="text-xs ml-1 text-muted-foreground">(You)</span>}
                  </p>
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