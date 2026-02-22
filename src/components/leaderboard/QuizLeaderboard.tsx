import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, Target, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface QuizEntry {
  user_id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  avgScore: number;
  quizzesPassed: number;
  totalAttempts: number;
}

function displayName(entry: QuizEntry) {
  return entry.nickname || entry.full_name.split(' ')[0];
}

export function QuizLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<QuizEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: rookieRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'rookie');

        if (!rookieRoles?.length) { setIsLoading(false); return; }

        const rookieIds = rookieRoles.map(r => r.user_id);

        const [profilesRes, progressRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name, nickname, avatar_url')
            .in('user_id', rookieIds)
            .not('status', 'eq', 'nlc'),
          supabase
            .from('lesson_progress')
            .select('user_id, quiz_score, quiz_passed, quiz_attempts')
            .in('user_id', rookieIds)
            .not('quiz_score', 'is', null),
        ]);

        const profiles = profilesRes.data || [];
        const progress = progressRes.data || [];

        const statsMap = new Map<string, { scores: number[]; passed: number; attempts: number }>();
        progress.forEach(p => {
          const existing = statsMap.get(p.user_id) || { scores: [], passed: 0, attempts: 0 };
          if (p.quiz_score !== null) existing.scores.push(p.quiz_score);
          if (p.quiz_passed) existing.passed++;
          existing.attempts += p.quiz_attempts || 0;
          statsMap.set(p.user_id, existing);
        });

        const leaderboard: QuizEntry[] = profiles
          .map(p => {
            const stats = statsMap.get(p.user_id);
            if (!stats || stats.scores.length === 0) return null;
            return {
              user_id: p.user_id,
              full_name: p.full_name,
              nickname: (p as any).nickname || null,
              avatar_url: p.avatar_url,
              avgScore: Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length),
              quizzesPassed: stats.passed,
              totalAttempts: stats.attempts,
            };
          })
          .filter(Boolean) as QuizEntry[];

        leaderboard.sort((a, b) => b.avgScore - a.avgScore || b.quizzesPassed - a.quizzesPassed);
        setEntries(leaderboard.slice(0, 20));
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
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
    return <div className="p-6 text-center"><div className="animate-pulse text-muted-foreground text-sm">Loading...</div></div>;
  }

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No quiz data yet</p>
      </div>
    );
  }

  // Rival callout for current user
  const myIdx = entries.findIndex(e => e.user_id === user?.id);
  const rivalCallout = myIdx > 0 ? entries[myIdx - 1] : null;

  return (
    <div>
      {/* Rival callout */}
      {myIdx > 0 && rivalCallout && (
        <div className="mx-4 mt-4 p-3 rounded-xl border bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold text-foreground">
              <span className="text-purple-400">{rivalCallout.avgScore - entries[myIdx].avgScore}%</span> behind {displayName(rivalCallout)}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 ml-6">Ace your next quiz to overtake!</p>
        </div>
      )}

      <div className="divide-y divide-border/30">
        {entries.map((entry, index) => {
          const isCurrentUser = entry.user_id === user?.id;
          const rank = index + 1;

          return (
            <div
              key={entry.user_id}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 transition-all",
                "hover:bg-muted/20",
                isCurrentUser && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <div className="w-6 flex justify-center">{getRankIcon(rank)}</div>
              <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold truncate",
                  isCurrentUser ? "text-primary" : "text-foreground"
                )}>
                  {displayName(entry)}
                  {isCurrentUser && <span className="text-xs font-normal ml-1 text-muted-foreground">(You)</span>}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {entry.quizzesPassed} passed · {entry.totalAttempts} attempts
                </p>
              </div>
              <div className="text-right">
                <span className={cn(
                  "text-base font-black tabular-nums",
                  entry.avgScore >= 95 ? "text-success" : entry.avgScore >= 80 ? "text-primary" : "text-amber-500"
                )}>
                  {entry.avgScore}%
                </span>
                <p className="text-[9px] text-muted-foreground font-medium">AVG</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
