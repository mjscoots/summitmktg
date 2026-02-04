import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  percentage: number;
  completed: number;
  total: number;
}

export function TrainingLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
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

        // Get total lesson count
        const { count: totalLessons } = await supabase
          .from('training_lessons')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Get completed lessons per user
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('user_id, lesson_id')
          .in('user_id', rookieIds)
          .not('completed_at', 'is', null);

        // Calculate completion per user
        const completionMap = new Map<string, number>();
        progress?.forEach(p => {
          completionMap.set(p.user_id, (completionMap.get(p.user_id) || 0) + 1);
        });

        const total = totalLessons || 1;
        const leaderboard: LeaderboardEntry[] = (profiles || []).map(p => {
          const completed = completionMap.get(p.user_id) || 0;
          return {
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            completed,
            total,
            percentage: Math.round((completed / total) * 100),
          };
        }).sort((a, b) => b.percentage - a.percentage);

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
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No training data yet</p>
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
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[100px]">
                  <div 
                    className="h-full bg-success transition-all"
                    style={{ width: `${entry.percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {entry.completed}/{entry.total}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-lg font-bold text-success">{entry.percentage}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}