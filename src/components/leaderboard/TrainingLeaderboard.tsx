import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, GraduationCap, Flame, Clock, BookOpen, Target, Crown, Star, Zap, CheckCircle2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Progress } from '@/components/ui/progress';
import { getReachableRookieTrainingItems, getCompletedTrainingCounts } from '@/lib/trainingProgressCalc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const POINTS = {
  LESSON_COMPLETED: 100,
  STREAK_DAY: 10,
  HOUR_LOGGED: 5,
  QUIZ_SCORE_MULTIPLIER: 3,
};

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  lessonsCompleted: number;
  totalLessons: number;
  streakDays: number;
  hoursThisWeek: number;
  avgQuizScore: number;
  totalPoints: number;
  progressPct: number;
  isActiveToday: boolean;
  breakdown: {
    lessonsPoints: number;
    streakPoints: number;
    hoursPoints: number;
    quizPoints: number;
  };
  weeklyBadge: string | null;
}

/** Display name: nickname if available, otherwise first name */
function displayName(entry: LeaderboardEntry) {
  return entry.nickname || entry.full_name.split(' ')[0];
}

const WEEKLY_BADGES: { id: string; icon: typeof Star; label: string; color: string; check: (e: LeaderboardEntry, rank: number) => boolean }[] = [
  { id: 'champion', icon: Crown, label: 'Weekly Champion', color: 'text-yellow-500', check: (_, rank) => rank === 1 },
  { id: 'quiz-master', icon: Target, label: 'Quiz Master', color: 'text-purple-500', check: (e) => e.avgQuizScore >= 95 },
  { id: 'grinder', icon: Clock, label: 'Grinder', color: 'text-blue-500', check: (e) => e.hoursThisWeek >= 5 },
  { id: 'fast-learner', icon: Zap, label: 'Fast Learner', color: 'text-amber-500', check: (e) => e.lessonsCompleted >= 10 },
];

export function TrainingLeaderboard() {
  const { user, role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';
  const [viewRole, setViewRole] = useState<'rookie' | 'manager'>('rookie');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  // Managers default to manager view
  useEffect(() => {
    if (isManager) setViewRole('rookie');
  }, [isManager]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', viewRole);

        if (!roleData || roleData.length === 0) {
          setEntries([]);
          setIsLoading(false);
          return;
        }

        const rookieIds = roleData.map(r => r.user_id);

        // Use shared canonical training item calculation (lessons + required videos)
        const trainingItems = await getReachableRookieTrainingItems();

        // Calculate current PST Monday for weekly reset
        const pstNowForWeek = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const pstDayForWeek = pstNowForWeek.getDay(); // 0=Sun
        const diffToMonday = pstDayForWeek === 0 ? -6 : 1 - pstDayForWeek;
        const weekMonday = new Date(pstNowForWeek);
        weekMonday.setDate(pstNowForWeek.getDate() + diffToMonday);
        weekMonday.setHours(0, 0, 0, 0);
        const weekMondayISO = weekMonday.toISOString();

        const [profilesRes, progressRes, videoProgressRes, streaksRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name, nickname, avatar_url, time_this_week_minutes, week_start, is_active_now, last_active_at')
            .in('user_id', rookieIds)
            .not('status', 'eq', 'nlc'),
          supabase
            .from('lesson_progress')
            .select('user_id, lesson_id, quiz_score, quiz_passed, completed_at')
            .in('user_id', rookieIds)
            .not('completed_at', 'is', null)
            .gte('completed_at', weekMondayISO),
          supabase
            .from('video_progress')
            .select('user_id, video_id, watched_at')
            .in('user_id', rookieIds)
            .eq('watched', true)
            .gte('watched_at', weekMondayISO),
          supabase
            .from('daily_login_streaks')
            .select('user_id, current_streak')
            .in('user_id', rookieIds),
        ]);

        const profiles = profilesRes.data || [];
        const totalItems = trainingItems.totalCount || 1;
        const progressData = progressRes.data || [];
        const videoProgressData = videoProgressRes.data || [];
        const streakMap = new Map(
          (streaksRes.data || []).map(s => [s.user_id, s.current_streak])
        );

        const userStats = new Map<string, { completed: number; quizScores: number[] }>();
        progressData.forEach(p => {
          if (!trainingItems.lessonIds.has(p.lesson_id)) return;
          const existing = userStats.get(p.user_id) || { completed: 0, quizScores: [] };
          existing.completed++;
          // Use recorded quiz_score if available; if quiz was passed but score is null (legacy), default to 100
          if (p.quiz_score !== null && p.quiz_score !== undefined) {
            existing.quizScores.push(p.quiz_score);
          } else if (p.quiz_passed) {
            existing.quizScores.push(100);
          }
          userStats.set(p.user_id, existing);
        });

        // Count watched required videos per user
        videoProgressData.forEach(vp => {
          if (!trainingItems.videoIds.has(vp.video_id)) return;
          const existing = userStats.get(vp.user_id) || { completed: 0, quizScores: [] };
          existing.completed++;
          userStats.set(vp.user_id, existing);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate current PST Monday for stale-week detection
        const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const pstDay = pstNow.getDay(); // 0=Sun
        const pstDiffToMon = pstDay === 0 ? -6 : 1 - pstDay;
        const pstMonday = new Date(pstNow);
        pstMonday.setDate(pstNow.getDate() + pstDiffToMon);
        const pstMondayStr = `${pstMonday.getFullYear()}-${String(pstMonday.getMonth() + 1).padStart(2, '0')}-${String(pstMonday.getDate()).padStart(2, '0')}`;

        const leaderboard: LeaderboardEntry[] = profiles.map(p => {
          const stats = userStats.get(p.user_id) || { completed: 0, quizScores: [] };
          const lessonsCompleted = stats.completed;
          const avgQuizScore = stats.quizScores.length > 0
            ? Math.round(stats.quizScores.reduce((a, b) => a + b, 0) / stats.quizScores.length)
            : 0;
          // If user's week_start is before current PST Monday, their data is stale — show 0
          const weekStartStr = (p as any).week_start || '1970-01-01';
          const minutesThisWeek = weekStartStr < pstMondayStr ? 0 : (p.time_this_week_minutes || 0);
          const hoursThisWeek = Math.round(minutesThisWeek / 60 * 10) / 10;
          const streakDays = streakMap.get(p.user_id) || 0;
          const progressPct = Math.round((lessonsCompleted / totalItems) * 100);

          const lastActive = p.last_active_at ? new Date(p.last_active_at) : null;
          const isActiveToday = lastActive ? lastActive >= today : false;

          const lessonsPoints = lessonsCompleted * POINTS.LESSON_COMPLETED;
          const streakPoints = streakDays * POINTS.STREAK_DAY;
          const hoursPoints = Math.round(hoursThisWeek * POINTS.HOUR_LOGGED);
          const quizPoints = Math.round(avgQuizScore * POINTS.QUIZ_SCORE_MULTIPLIER);
          const totalPoints = lessonsPoints + streakPoints + hoursPoints + quizPoints;

          return {
            user_id: p.user_id,
            full_name: p.full_name,
            nickname: (p as any).nickname || null,
            avatar_url: p.avatar_url,
            lessonsCompleted,
            totalLessons: totalItems,
            streakDays,
            hoursThisWeek,
            avgQuizScore,
            totalPoints,
            progressPct,
            isActiveToday,
            breakdown: { lessonsPoints, streakPoints, hoursPoints, quizPoints },
            weeklyBadge: null,
          };
        }).sort((a, b) => b.totalPoints - a.totalPoints);

        leaderboard.forEach((entry, index) => {
          const rank = index + 1;
          for (const badge of WEEKLY_BADGES) {
            if (badge.check(entry, rank)) {
              entry.weeklyBadge = badge.id;
              break;
            }
          }
        });

        // Filter: minimum 100 points to show
        const filtered = leaderboard.filter(e => e.totalPoints >= 100);
        setEntries(filtered.slice(0, 20));
        setTimeout(() => setAnimateIn(true), 100);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [viewRole]);

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
      <div>
        {/* Role Toggle */}
        <div className="px-4 pt-4">
          <div className="p-0.5 bg-muted/50 rounded-lg inline-flex border border-border/30">
            <button
              onClick={() => setViewRole('rookie')}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                viewRole === 'rookie' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >Rookies</button>
            <button
              onClick={() => setViewRole('manager')}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                viewRole === 'manager' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >Managers</button>
          </div>
        </div>
        <div className="p-8 text-center">
          <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No one with 100+ points yet</p>
        </div>
      </div>
    );
  }

  const top3 = entries.slice(0, Math.min(3, entries.length));
  const rest = entries.slice(3);

  return (
    <div>
      {/* Role Toggle */}
      <div className="px-4 pt-4">
        <div className="p-0.5 bg-muted/50 rounded-lg inline-flex border border-border/30">
          <button
            onClick={() => setViewRole('rookie')}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              viewRole === 'rookie' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
          >Rookies</button>
          <button
            onClick={() => setViewRole('manager')}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              viewRole === 'manager' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
          >Managers</button>
        </div>
      </div>

      {/* ===== YOUR RANK + RIVAL SYSTEM ===== */}
      {(() => {
        const myRank = entries.findIndex(e => e.user_id === user?.id);
        if (myRank === -1) return null;
        const me = entries[myRank];
        const rank = myRank + 1;
        const totalUsers = entries.length;
        const topPct = Math.round((rank / totalUsers) * 100);
        const pointsToNext = myRank > 0 ? entries[myRank - 1].totalPoints - me.totalPoints : 0;
        const rival = myRank > 0 ? entries[myRank - 1] : null;
        const chaser = myRank < entries.length - 1 ? entries[myRank + 1] : null;
        const chaserGap = chaser ? me.totalPoints - chaser.totalPoints : 0;

        let accentClass = 'from-primary/15 to-primary/5 border-primary/20';
        if (rank === 1) accentClass = 'from-yellow-500/15 to-yellow-500/5 border-yellow-500/20';
        else if (rank <= 3) accentClass = 'from-success/15 to-success/5 border-success/20';
        else if (topPct > 50) accentClass = 'from-amber-500/15 to-amber-500/5 border-amber-500/20';

        return (
          <div className="mx-4 mt-4 space-y-2">
            {/* Rank card */}
            <div className={cn(
              "p-3.5 rounded-xl border bg-gradient-to-r flex items-center gap-3",
              accentClass
            )}>
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                <span className="text-sm font-black text-primary">#{rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {rank === 1 ? "👑 You're #1! Keep dominating." : `Top ${topPct}% — ${me.totalPoints.toLocaleString()} pts`}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-primary">{me.progressPct}% trained</span>
                  {me.streakDays > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Flame className={cn("w-3 h-3", me.streakDays >= 7 ? "text-orange-500" : "text-orange-400/70")} />
                        {me.streakDays}d streak
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Rival callout */}
            {rival && pointsToNext > 0 && (
              <div className="p-3 rounded-xl border border-destructive/20 bg-gradient-to-r from-destructive/8 to-transparent flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-destructive/10">
                  <Target className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">
                    You're <span className="text-destructive">{pointsToNext.toLocaleString()} pts</span> behind {displayName(rival)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Complete 1 lesson to close the gap</p>
                </div>
              </div>
            )}

            {/* Chaser warning */}
            {chaser && chaserGap < 200 && chaserGap > 0 && (
              <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[11px] text-amber-400 font-medium">
                  {displayName(chaser)} is <span className="font-bold">{chaserGap} pts</span> behind and gaining
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== PODIUM ===== */}
      {top3.length >= 3 && (
        <div className="relative px-4 pt-10 pb-6 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-primary/8 rounded-full blur-[60px]" />

          <div className="relative flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <PodiumSlot
              entry={top3[1]}
              rank={2}
              animateIn={animateIn}
              delay="200ms"
              podiumH="h-20"
              podiumGradient="from-gray-400/30 via-gray-400/15 to-transparent"
              ringColor="ring-gray-400/60"
              medalIcon={<Medal className="w-5 h-5 text-gray-400" />}
              rankBg="bg-gradient-to-br from-gray-400 to-gray-500"
              onClick={() => setSelectedEntry(top3[1])}
            />
            {/* 1st Place */}
            <PodiumSlot
              entry={top3[0]}
              rank={1}
              animateIn={animateIn}
              delay="0ms"
              podiumH="h-28"
              podiumGradient="from-yellow-500/30 via-yellow-500/10 to-transparent"
              ringColor="ring-yellow-500/70"
              medalIcon={<Trophy className="w-7 h-7 text-yellow-500" />}
              rankBg="bg-gradient-to-br from-yellow-400 to-yellow-600"
              isChampion
              onClick={() => setSelectedEntry(top3[0])}
            />
            {/* 3rd Place */}
            <PodiumSlot
              entry={top3[2]}
              rank={3}
              animateIn={animateIn}
              delay="400ms"
              podiumH="h-14"
              podiumGradient="from-amber-600/25 via-amber-600/10 to-transparent"
              ringColor="ring-amber-600/60"
              medalIcon={<Award className="w-5 h-5 text-amber-600" />}
              rankBg="bg-gradient-to-br from-amber-500 to-amber-700"
              onClick={() => setSelectedEntry(top3[2])}
            />
          </div>
        </div>
      )}

      {/* Weekly Badges */}
      {entries.some(e => e.weeklyBadge) && (
        <div className="px-4 py-3 bg-muted/20 border-y border-border/30">
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
                  <span className="font-medium text-foreground">{displayName(entry)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className={cn('font-semibold', badge.color)}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Leaderboard List */}
      <div className="divide-y divide-border/30">
        {rest.map((entry, index) => {
          const isCurrentUser = entry.user_id === user?.id;
          const rank = index + 4;
          const badge = getBadgeInfo(entry.weeklyBadge);

          return (
            <div
              key={entry.user_id}
              onClick={() => setSelectedEntry(entry)}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 transition-all cursor-pointer group",
                "hover:bg-muted/20",
                isCurrentUser && "bg-primary/5 border-l-2 border-l-primary"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center">
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  rank <= 5 ? "text-foreground" : "text-muted-foreground"
                )}>{rank}</span>
              </div>

              {/* Avatar */}
              <div className="relative">
                <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="sm" />
                {entry.isActiveToday && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn(
                    "text-sm font-semibold truncate",
                    isCurrentUser ? "text-primary" : "text-foreground"
                  )}>
                    {displayName(entry)}
                    {isCurrentUser && <span className="text-xs font-normal ml-1 text-muted-foreground">(You)</span>}
                  </p>
                  {badge && <badge.icon className={cn('w-3.5 h-3.5 flex-shrink-0', badge.color)} />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={entry.progressPct} className="h-1.5 flex-1" />
                  <span className={cn(
                    "text-[10px] font-bold tabular-nums min-w-[32px] text-right",
                    entry.progressPct >= 80 ? "text-success" : entry.progressPct >= 40 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {entry.progressPct}%
                  </span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right pl-2">
                <span className="text-base font-black text-primary tabular-nums">{entry.totalPoints.toLocaleString()}</span>
                <p className="text-[9px] text-muted-foreground font-medium">PTS</p>
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
                <p className="text-lg">{selectedEntry ? displayName(selectedEntry) : ''}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  Rank #{entries.findIndex(e => e.user_id === selectedEntry?.user_id) + 1} · {selectedEntry?.totalPoints.toLocaleString()} pts
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-3 pt-2">
              {/* Training Progress */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    Training Progress
                  </span>
                  <span className={cn("text-sm font-bold",
                    selectedEntry.progressPct >= 80 ? "text-success" : selectedEntry.progressPct >= 40 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {selectedEntry.progressPct}%
                  </span>
                </div>
                <Progress value={selectedEntry.progressPct} className="h-2.5" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {selectedEntry.lessonsCompleted} of {selectedEntry.totalLessons} lessons completed
                </p>
              </div>

              {/* Daily Activity */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border",
                selectedEntry.isActiveToday
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              )}>
                <Activity className={cn("w-4 h-4", selectedEntry.isActiveToday ? "text-success" : "text-destructive")} />
                <span className={cn("text-sm font-medium", selectedEntry.isActiveToday ? "text-success" : "text-destructive")}>
                  {selectedEntry.isActiveToday ? "Active today ✓" : "Not logged in today"}
                </span>
              </div>

              {/* Badge */}
              {(() => {
                const badge = getBadgeInfo(selectedEntry.weeklyBadge);
                if (!badge) return null;
                const BadgeIcon = badge.icon;
                return (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30">
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
                  <span className="text-2xl font-black text-primary">
                    {selectedEntry.totalPoints.toLocaleString()}
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

// ── Podium slot sub-component ──
function PodiumSlot({
  entry, rank, animateIn, delay, podiumH, podiumGradient, ringColor, medalIcon, rankBg, isChampion, onClick
}: {
  entry: LeaderboardEntry; rank: number; animateIn: boolean; delay: string;
  podiumH: string; podiumGradient: string; ringColor: string;
  medalIcon: React.ReactNode; rankBg: string; isChampion?: boolean; onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center transition-all duration-700",
        animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: delay }}
    >
      {/* Avatar */}
      <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={onClick}>
        <div className={cn(
          "rounded-full p-0.5",
          isChampion ? "bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600" : ""
        )}>
          <UserAvatar
            avatarUrl={entry.avatar_url}
            fullName={entry.full_name}
            size="lg"
            className={cn(
              "shadow-lg",
              !isChampion && ringColor,
              !isChampion && "ring-2",
              isChampion && "ring-0 !w-16 !h-16"
            )}
          />
        </div>
        {isChampion ? (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Crown className="w-6 h-6 text-yellow-500 drop-shadow-lg" />
          </div>
        ) : (
          <div className={cn("absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md", rankBg)}>
            {rank}
          </div>
        )}
        {entry.isActiveToday && (
          <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-card" />
        )}
      </div>

      {/* Name */}
      <p className={cn(
        "font-bold text-foreground mt-2 truncate text-center",
        isChampion ? "text-sm max-w-[100px]" : "text-xs max-w-[80px]"
      )}>
        {displayName(entry)}
      </p>

      {/* Points */}
      <p className={cn(
        "font-black text-primary tabular-nums",
        isChampion ? "text-xl" : "text-sm"
      )}>
        {entry.totalPoints.toLocaleString()}
      </p>
      <span className="text-[9px] text-muted-foreground font-semibold -mt-0.5">PTS</span>

      {/* Podium bar */}
      <div className={cn(
        "rounded-t-xl mt-2 border border-border/30 flex items-end justify-center pb-2",
        podiumH,
        `bg-gradient-to-t ${podiumGradient}`,
        isChampion ? "w-28" : "w-22"
      )}>
        {medalIcon}
      </div>
    </div>
  );
}
