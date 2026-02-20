import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Trophy, Shield, Award, Star, Mountain } from 'lucide-react';
import { getReachableRookieTrainingItems, getCompletedTrainingCounts } from '@/lib/trainingProgressCalc';

interface LeaderboardEntry {
  userId: string;
  name: string;
  globalPercent: number;
  completedCount: number;
  badges: string[];
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

  // Show all rookies regardless of viewer role

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user?.id) return;

      try {
        // Get all rookie profiles for leaderboard (consistent with Training tab)
        const { data: rookieRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'rookie');

        if (!rookieRoles || rookieRoles.length === 0) { setIsLoading(false); return; }

        const rookieIds = rookieRoles.map(r => r.user_id);

        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', rookieIds)
          .not('status', 'eq', 'nlc');

        const profiles = allProfiles || [];

        if (profiles.length === 0) { setIsLoading(false); return; }

        // Use shared canonical training item calculation (lessons + videos)
        const trainingItems = await getReachableRookieTrainingItems();
        const totalItems = trainingItems.totalCount;

        const userIds = profiles.map(p => p.user_id);
        
        // Use shared completion counting (lessons + videos)
        const completedCounts = await getCompletedTrainingCounts(userIds, trainingItems);

        // Get all achievements
        const { data: allAchievements } = await supabase
          .from('user_training_achievements')
          .select('user_id, badge_type')
          .in('user_id', userIds);

        // Build entries
        const leaderboard: LeaderboardEntry[] = profiles.map(p => {
          const totalDone = completedCounts.get(p.user_id) || 0;
          const globalPercent = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

          const badges = (allAchievements || [])
            .filter(a => a.user_id === p.user_id && ['bronze', 'silver', 'gold', 'summit'].includes(a.badge_type))
            .map(a => a.badge_type);

          return {
            userId: p.user_id,
            name: p.full_name,
            globalPercent,
            completedCount: totalDone,
            badges,
          };
        });

        // Sort by completion % desc
        leaderboard.sort((a, b) => b.globalPercent - a.globalPercent);
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
                    {entry.name}
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
