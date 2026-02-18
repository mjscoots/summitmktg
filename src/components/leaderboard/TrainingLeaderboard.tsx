import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, GraduationCap, Flame, Clock, BookOpen, Target, Info, ArrowUp, ArrowDown, Minus, Crown, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Point weights for leaderboard scoring
const POINTS = {
  LESSON_COMPLETED: 100,
  STREAK_DAY: 10,
  HOUR_LOGGED: 5,
  QUIZ_SCORE_MULTIPLIER: 3,
};

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  lessonsCompleted: number;
  totalLessons: number;
  streakDays: number;
  hoursThisWeek: number;
  avgQuizScore: number;
  totalPoints: number;
  breakdown: {
    lessonsPoints: number;
    streakPoints: number;
    hoursPoints: number;
    quizPoints: number;
  };
  // Weekly badge
  weeklyBadge: string | null;
}

// Weekly badge definitions
const WEEKLY_BADGES: { id: string; icon: typeof Star; label: string; color: string; check: (e: LeaderboardEntry, rank: number) => boolean }[] = [
  { id: 'champion', icon: Crown, label: 'Weekly Champion', color: 'text-yellow-500', check: (_, rank) => rank === 1 },
  { id: 'quiz-master', icon: Target, label: 'Quiz Master', color: 'text-purple-500', check: (e) => e.avgQuizScore >= 95 },
  { id: 'grinder', icon: Clock, label: 'Grinder', color: 'text-blue-500', check: (e) => e.hoursThisWeek >= 5 },
  { id: 'fast-learner', icon: Zap, label: 'Fast Learner', color: 'text-amber-500', check: (e) => e.lessonsCompleted >= 10 },
];

export function TrainingLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
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

        const [profilesRes, totalLessonsRes, progressRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, time_this_week_minutes')
            .in('user_id', rookieIds)
            .not('status', 'eq', 'nlc'),
          supabase
            .from('training_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('lesson_progress')
            .select('user_id, lesson_id, quiz_score, completed_at')
            .in('user_id', rookieIds)
            .not('completed_at', 'is', null)
        ]);

        const profiles = profilesRes.data || [];
        const totalLessons = totalLessonsRes.count || 1;
        const progress = progressRes.data || [];

        const userStats = new Map<string, { completed: number; quizScores: number[] }>();
        progress.forEach(p => {
          const existing = userStats.get(p.user_id) || { completed: 0, quizScores: [] };
          existing.completed++;
          if (p.quiz_score !== null && p.quiz_score !== undefined) {
            existing.quizScores.push(p.quiz_score);
          }
          userStats.set(p.user_id, existing);
        });

        const leaderboard: LeaderboardEntry[] = profiles.map(p => {
          const stats = userStats.get(p.user_id) || { completed: 0, quizScores: [] };
          const lessonsCompleted = stats.completed;
          const avgQuizScore = stats.quizScores.length > 0
            ? Math.round(stats.quizScores.reduce((a, b) => a + b, 0) / stats.quizScores.length)
            : 0;
          const hoursThisWeek = Math.round((p.time_this_week_minutes || 0) / 60 * 10) / 10;
          const streakDays = 0;

          const lessonsPoints = lessonsCompleted * POINTS.LESSON_COMPLETED;
          const streakPoints = streakDays * POINTS.STREAK_DAY;
          const hoursPoints = Math.round(hoursThisWeek * POINTS.HOUR_LOGGED);
          const quizPoints = Math.round(avgQuizScore * POINTS.QUIZ_SCORE_MULTIPLIER);
          const totalPoints = lessonsPoints + streakPoints + hoursPoints + quizPoints;

          return {
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            lessonsCompleted,
            totalLessons,
            streakDays,
            hoursThisWeek,
            avgQuizScore,
            totalPoints,
            breakdown: { lessonsPoints, streakPoints, hoursPoints, quizPoints },
            weeklyBadge: null,
          };
        }).sort((a, b) => b.totalPoints - a.totalPoints);

        // Assign weekly badges
        leaderboard.forEach((entry, index) => {
          const rank = index + 1;
          for (const badge of WEEKLY_BADGES) {
            if (badge.check(entry, rank)) {
              entry.weeklyBadge = badge.id;
              break;
            }
          }
        });

        setEntries(leaderboard.slice(0, 20));
        // Trigger animation
        setTimeout(() => setAnimateIn(true), 100);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getBadgeInfo = (badgeId: string | null) => {
    if (!badgeId) return null;
    return WEEKLY_BADGES.find(b => b.id === badgeId) || null;
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

  const top3 = entries.slice(0, Math.min(3, entries.length));
  const rest = entries.slice(3);

  return (
    <div>
      {/* Point breakdown legend */}
      <div className="px-4 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>Points: Lessons (100) • Streak (10/day) • Hours (5/hr) • Quiz Avg (3/%)</span>
        </div>
      </div>

      {/* ===== PODIUM ===== */}
      {top3.length >= 3 && (
        <div className="relative px-4 pt-8 pb-4 bg-gradient-to-b from-primary/5 via-muted/10 to-transparent border-b border-border/50 overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 rounded-full blur-3xl" />

          <div className="relative flex items-end justify-center gap-3">
            {/* 2nd Place */}
            <div
              className={cn(
                "flex flex-col items-center transition-all duration-700",
                animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: '200ms' }}
            >
              <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedEntry(top3[1])}>
                <UserAvatar avatarUrl={top3[1].avatar_url} fullName={top3[1].full_name} size="lg" className="ring-2 ring-gray-400 shadow-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  2
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground mt-2 truncate max-w-[80px]">{top3[1].full_name.split(' ')[0]}</p>
              <p className="text-sm font-bold text-primary">{top3[1].totalPoints.toLocaleString()}</p>
              {/* Podium bar */}
              <div className="w-20 h-16 bg-gradient-to-t from-gray-500/20 to-gray-400/10 rounded-t-lg mt-2 border border-gray-400/20 flex items-center justify-center">
                <Medal className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* 1st Place */}
            <div
              className={cn(
                "flex flex-col items-center transition-all duration-700",
                animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              )}
              style={{ transitionDelay: '0ms' }}
            >
              <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedEntry(top3[0])}>
                <UserAvatar avatarUrl={top3[0].avatar_url} fullName={top3[0].full_name} size="lg" className="ring-4 ring-yellow-500 shadow-xl shadow-yellow-500/20 !w-16 !h-16" />
                <div className="absolute -top-2 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-sm font-bold text-foreground mt-2 truncate max-w-[100px]">{top3[0].full_name.split(' ')[0]}</p>
              <p className="text-lg font-black text-primary">{top3[0].totalPoints.toLocaleString()}</p>
              {/* Podium bar - tallest */}
              <div className="w-24 h-24 bg-gradient-to-t from-yellow-500/20 to-yellow-400/5 rounded-t-lg mt-2 border border-yellow-500/30 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-yellow-500" />
              </div>
            </div>

            {/* 3rd Place */}
            <div
              className={cn(
                "flex flex-col items-center transition-all duration-700",
                animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: '400ms' }}
            >
              <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedEntry(top3[2])}>
                <UserAvatar avatarUrl={top3[2].avatar_url} fullName={top3[2].full_name} size="lg" className="ring-2 ring-amber-600 shadow-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  3
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground mt-2 truncate max-w-[80px]">{top3[2].full_name.split(' ')[0]}</p>
              <p className="text-sm font-bold text-primary">{top3[2].totalPoints.toLocaleString()}</p>
              {/* Podium bar */}
              <div className="w-20 h-12 bg-gradient-to-t from-amber-600/20 to-amber-600/5 rounded-t-lg mt-2 border border-amber-600/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Badges Row */}
      {entries.some(e => e.weeklyBadge) && (
        <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">This Week's Badges</p>
          <div className="flex flex-wrap gap-2">
            {entries.filter(e => e.weeklyBadge).map(entry => {
              const badge = getBadgeInfo(entry.weeklyBadge);
              if (!badge) return null;
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={entry.user_id + badge.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-full border border-border/50 text-xs"
                >
                  <BadgeIcon className={cn('w-3.5 h-3.5', badge.color)} />
                  <span className="font-medium text-foreground">{entry.full_name.split(' ')[0]}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className={cn('font-semibold', badge.color)}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Leaderboard List */}
      <div className="divide-y divide-border/50">
        {rest.map((entry, index) => {
          const isCurrentUser = entry.user_id === user?.id;
          const rank = index + 4;
          const badge = getBadgeInfo(entry.weeklyBadge);

          return (
            <div
              key={entry.user_id}
              onClick={() => setSelectedEntry(entry)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-all cursor-pointer hover:bg-muted/30",
                "animate-fade-in",
                isCurrentUser && "bg-primary/5 border-l-2 border-l-primary"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-8 flex justify-center">
                <span className="text-sm font-bold text-muted-foreground">{rank}</span>
              </div>

              <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="sm" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isCurrentUser ? "text-primary" : "text-foreground"
                  )}>
                    {entry.full_name}
                    {isCurrentUser && <span className="text-xs ml-1 text-muted-foreground">(You)</span>}
                  </p>
                  {badge && (
                    <badge.icon className={cn('w-3.5 h-3.5 flex-shrink-0', badge.color)} />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><BookOpen className="w-3 h-3" /> {entry.lessonsCompleted}</span>
                  <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-500" /> {entry.streakDays}d</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {entry.hoursThisWeek}h</span>
                  <span className="flex items-center gap-0.5"><Target className="w-3 h-3" /> {entry.avgQuizScore}%</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-bold text-primary">{entry.totalPoints.toLocaleString()}</span>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Point Breakdown Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <UserAvatar avatarUrl={selectedEntry?.avatar_url || null} fullName={selectedEntry?.full_name || ''} size="md" />
              <div>
                <p>{selectedEntry?.full_name}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  Rank #{entries.findIndex(e => e.user_id === selectedEntry?.user_id) + 1}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-3 pt-2">
              {/* Badge */}
              {(() => {
                const badge = getBadgeInfo(selectedEntry.weeklyBadge);
                if (!badge) return null;
                const BadgeIcon = badge.icon;
                return (
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", `border-${badge.color.replace('text-', '')}/20 bg-${badge.color.replace('text-', '')}/5`)}>
                    <BadgeIcon className={cn('w-5 h-5', badge.color)} />
                    <span className={cn('text-sm font-semibold', badge.color)}>{badge.label}</span>
                  </div>
                );
              })()}

              {[
                { icon: BookOpen, label: 'Lessons Completed', detail: `${selectedEntry.lessonsCompleted} × ${POINTS.LESSON_COMPLETED}`, value: selectedEntry.breakdown.lessonsPoints, color: 'text-success' },
                { icon: Flame, label: 'Training Streak', detail: `${selectedEntry.streakDays} days × ${POINTS.STREAK_DAY}`, value: selectedEntry.breakdown.streakPoints, color: 'text-orange-500' },
                { icon: Clock, label: 'Hours This Week', detail: `${selectedEntry.hoursThisWeek} hrs × ${POINTS.HOUR_LOGGED}`, value: selectedEntry.breakdown.hoursPoints, color: 'text-blue-500' },
                { icon: Target, label: 'Avg Quiz Score', detail: `${selectedEntry.avgQuizScore}% × ${POINTS.QUIZ_SCORE_MULTIPLIER}`, value: selectedEntry.breakdown.quizPoints, color: 'text-purple-500' },
              ].map(({ icon: Icon, label, detail, value, color }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-5 h-5', color)} />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                  <span className={cn('text-lg font-bold', color)}>+{value.toLocaleString()}</span>
                </div>
              ))}

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">Total Score</p>
                  <span className="text-2xl font-bold text-primary">
                    {selectedEntry.totalPoints.toLocaleString()} pts
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
