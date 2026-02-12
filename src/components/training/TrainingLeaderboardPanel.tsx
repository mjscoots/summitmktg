import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Trophy, Shield, Award, Star, Mountain } from 'lucide-react';

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
  const { user, role } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user?.id) return;

      try {
        // Get profiles (rookies visible to everyone, full list for managers)
        let profiles: { user_id: string; full_name: string }[] = [];

        if (isManager) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          if (myProfile) {
            const { data: downline } = await supabase
              .rpc('get_user_downline', { _manager_name: myProfile.full_name });
            profiles = (downline || [])
              .filter(d => d.role === 'rookie')
              .map(d => ({ user_id: d.user_id, full_name: d.full_name }));
          }
        } else {
          // Rookies see their team peers
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (myProfile?.team_id) {
            const { data: teamMembers } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .eq('team_id', myProfile.team_id)
              .neq('status', 'nlc');
            profiles = teamMembers || [];
          }
        }

        if (profiles.length === 0) { setIsLoading(false); return; }

        // Get course structure for progress calc
        const slugs = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];
        const { data: courses } = await supabase
          .from('training_courses')
          .select('id, slug')
          .eq('is_active', true)
          .in('slug', slugs);

        if (!courses) { setIsLoading(false); return; }

        // Get lesson IDs
        let allLessonIds: string[] = [];
        for (const course of courses) {
          if (course.slug === 'training-videos') continue;
          const { data: modules } = await supabase
            .from('training_modules')
            .select('id')
            .eq('course_id', course.id)
            .eq('is_active', true);
          const moduleIds = modules?.map(m => m.id) || [];
          if (moduleIds.length === 0) continue;
          const { data: lessons } = await supabase
            .from('training_lessons')
            .select('id')
            .in('module_id', moduleIds)
            .eq('is_active', true);
          allLessonIds = allLessonIds.concat(lessons?.map(l => l.id) || []);
        }

        const { count: totalVideos } = await supabase
          .from('training_videos')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        const totalItems = allLessonIds.length + (totalVideos || 0);

        // Get all achievements
        const userIds = profiles.map(p => p.user_id);
        const { data: allAchievements } = await supabase
          .from('user_training_achievements')
          .select('user_id, badge_type')
          .in('user_id', userIds);

        // Build entries
        const leaderboard: LeaderboardEntry[] = await Promise.all(
          profiles.map(async (p) => {
            const { data: lessonProg } = await supabase
              .from('lesson_progress')
              .select('lesson_id')
              .eq('user_id', p.user_id)
              .eq('quiz_passed', true);

            const completedLessonIds = new Set(lessonProg?.map(lp => lp.lesson_id) || []);
            const lessonsDone = allLessonIds.filter(id => completedLessonIds.has(id)).length;

            const { count: videosDone } = await supabase
              .from('video_progress')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', p.user_id)
              .eq('watched', true);

            const totalDone = lessonsDone + (videosDone || 0);
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
          })
        );

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
  }, [user?.id, isManager]);

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
