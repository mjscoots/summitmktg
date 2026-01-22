import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { startOfWeek, format } from 'date-fns';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  total_points: number;
  training_points: number;
  call_attendance_points: number;
  roleplay_points: number;
  quiz_points: number;
  profile: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  role: 'rookie' | 'manager';
}

export function WeeklyLeaderboard() {
  const { role, user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user) return;

      try {
        // Get start of current week (Monday)
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        // Fetch leaderboard entries for this week
        const { data: pointsData, error: pointsError } = await supabase
          .from('leaderboard_points')
          .select(`
            id,
            user_id,
            total_points,
            training_points,
            call_attendance_points,
            roleplay_points,
            quiz_points
          `)
          .eq('week_start', weekStartStr)
          .order('total_points', { ascending: false })
          .limit(20);

        if (pointsError) {
          console.error('Error fetching leaderboard:', pointsError);
          return;
        }

        if (!pointsData || pointsData.length === 0) {
          setLeaderboard([]);
          setIsLoading(false);
          return;
        }

        // Fetch profiles and roles for these users
        const userIds = pointsData.map(p => p.user_id);

        const [profilesRes, rolesRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', userIds),
          supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', userIds)
        ]);

        const profilesMap = new Map(
          (profilesRes.data || []).map(p => [p.user_id, p])
        );
        const rolesMap = new Map(
          (rolesRes.data || []).map(r => [r.user_id, r.role])
        );

        const entries: LeaderboardEntry[] = pointsData.map(p => ({
          ...p,
          profile: profilesMap.get(p.user_id) || null,
          role: (rolesMap.get(p.user_id) as 'rookie' | 'manager') || 'rookie'
        }));

        // Filter based on viewer's role
        const filteredEntries = isManager 
          ? entries 
          : entries.filter(e => e.role === 'rookie');

        setLeaderboard(filteredEntries);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user, isManager]);

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
      {leaderboard.map((entry, index) => {
        const isCurrentUser = entry.user_id === user?.id;
        const rank = index + 1;

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
              isCurrentUser
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-card/50 hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-center w-8">
              {getRankIcon(rank)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium text-sm ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                  {entry.profile?.full_name || 'Unknown User'}
                </span>
                {isCurrentUser && (
                  <span className="text-xs text-primary">(You)</span>
                )}
                {isManager && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    entry.role === 'manager' 
                      ? 'bg-blue-500/10 text-blue-400' 
                      : 'bg-green-500/10 text-green-400'
                  }`}>
                    {entry.role === 'manager' ? 'MGR' : 'RKE'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span>🎓 {entry.training_points}</span>
                <span>📞 {entry.call_attendance_points}</span>
                <span>🎭 {entry.roleplay_points}</span>
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
