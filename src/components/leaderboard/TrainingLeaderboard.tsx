import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, GraduationCap, Flame, Clock, BookOpen, Target, Crown, Star, Zap, Activity, Video, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const POINTS = {
  HOUR_LOGGED: 40,
  LESSON_COMPLETED: 100,
  VIDEO_WATCHED: 40,
  STREAK_DAY: 15,
  MANUAL_CHAPTER: 30,
  ONE_ON_ONE: 50,
};

interface TrainingLeaderboardProps {
  mode?: 'overall' | 'weekly';
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  totalPoints: number;
  // Weekly-specific fields
  lessonsCompleted: number;
  totalLessons: number;
  streakDays: number;
  hoursThisWeek: number;
  avgQuizScore: number;
  progressPct: number;
  isActiveToday: boolean;
  timeThisWeekMinutes: number;
  teamName: string | null;
  breakdown: {
    hoursPoints: number;
    thresholdBonus: number;
    lessonsPoints: number;
    videoPoints: number;
    streakPoints: number;
    manualPoints: number;
    oneOnOnePoints: number;
  };
  weeklyBadge: string | null;
}

function displayName(entry: LeaderboardEntry) {
  return entry.nickname || entry.full_name.split(' ')[0];
}

const WEEKLY_BADGES: { id: string; icon: typeof Star; label: string; color: string; check: (e: LeaderboardEntry, rank: number) => boolean }[] = [
  { id: 'champion', icon: Crown, label: 'Weekly Champion', color: 'text-yellow-500', check: (_, rank) => rank === 1 },
  { id: 'quiz-master', icon: Target, label: 'Quiz Master', color: 'text-purple-500', check: (e) => e.avgQuizScore >= 95 },
  { id: 'grinder', icon: Clock, label: 'Grinder', color: 'text-blue-500', check: (e) => e.hoursThisWeek >= 5 },
  { id: 'fast-learner', icon: Zap, label: 'Fast Learner', color: 'text-amber-500', check: (e) => e.lessonsCompleted >= 10 },
];

export function TrainingLeaderboard({ mode = 'overall' }: TrainingLeaderboardProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async (isRefresh = false) => {
      if (!isRefresh) {
        setIsLoading(true);
        setAnimateIn(false);
      }
      try {
        let leaderboard: LeaderboardEntry[] = [];

        if (mode === 'overall') {
          // ALL-TIME: Use get_all_time_leaderboard RPC
          const { data, error } = await (supabase as any).rpc('get_all_time_leaderboard', { _limit: 50 });
          if (error) {
            console.error('All-time leaderboard RPC error:', error);
            if (!isRefresh) setEntries([]);
            setIsLoading(false);
            return;
          }

          leaderboard = (data || []).map((row: any) => ({
            user_id: row.user_id,
            full_name: row.full_name,
            nickname: row.nickname || null,
            avatar_url: row.avatar_url,
            totalPoints: row.cumulative_points || 0,
            lessonsCompleted: 0,
            totalLessons: 1,
            streakDays: row.current_streak || 0,
            hoursThisWeek: 0,
            avgQuizScore: 0,
            progressPct: 0,
            isActiveToday: false,
            timeThisWeekMinutes: 0,
            teamName: row.team_name || null,
            breakdown: { hoursPoints: 0, thresholdBonus: 0, lessonsPoints: 0, videoPoints: 0, streakPoints: 0, manualPoints: 0, oneOnOnePoints: 0 },
            weeklyBadge: null,
          }));
        } else {
          // WEEKLY: Use get_current_leaderboard RPC
          const { data, error } = await (supabase as any).rpc('get_current_leaderboard');
          if (error) {
            console.error('Weekly leaderboard RPC error:', error);
            if (!isRefresh) setEntries([]);
            setIsLoading(false);
            return;
          }

          leaderboard = (data || [])
            .filter((row: any) => (row.total_points || 0) > 0)
            .map((row: any) => ({
              user_id: row.user_id,
              full_name: row.full_name,
              nickname: row.nickname || null,
              avatar_url: row.avatar_url,
              totalPoints: row.total_points || 0,
              lessonsCompleted: Number(row.lessons_completed) || 0,
              totalLessons: 1,
              streakDays: row.current_streak || 0,
              hoursThisWeek: Math.round((row.time_this_week_minutes || 0) / 60 * 10) / 10,
              avgQuizScore: 0,
              progressPct: 0,
              isActiveToday: false,
              timeThisWeekMinutes: row.time_this_week_minutes || 0,
              teamName: row.team_name || null,
              breakdown: {
                hoursPoints: row.hours_points || 0,
                thresholdBonus: row.threshold_bonus || 0,
                lessonsPoints: row.lesson_points || 0,
                videoPoints: row.video_points || 0,
                streakPoints: row.streak_points || 0,
                manualPoints: row.manual_points || 0,
                oneOnOnePoints: row.one_on_one_points || 0,
              },
              weeklyBadge: null,
            }));

          // Assign weekly badges
          leaderboard.forEach((entry, index) => {
            for (const badge of WEEKLY_BADGES) {
              if (badge.check(entry, index + 1)) {
                entry.weeklyBadge = badge.id;
                break;
              }
            }
          });
        }

        setEntries(leaderboard);
        if (!isRefresh) setTimeout(() => setAnimateIn(true), 100);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard(false);
    const interval = setInterval(() => fetchLeaderboard(true), 30000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (entries.length > 0) {
      console.log(`[Leaderboard ${mode}] Top 5:`, entries.slice(0, 5).map((u, i) => ({
        rank: i + 1, name: u.full_name, points: u.totalPoints,
      })));
    }
  }, [entries, mode]);

  const getBadgeInfo = (badgeId: string | null) => {
    if (!badgeId) return null;
    return WEEKLY_BADGES.find(b => b.id === badgeId) || null;
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
          <span className="text-muted-foreground text-sm animate-pulse">Loading rankings...</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No activity yet this period</p>
      </div>
    );
  }

  const top3 = entries.slice(0, Math.min(3, entries.length));
  const rest = entries.slice(3);
  const isWeekly = mode === 'weekly';

  return (
    <div>
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
            <div className={cn("p-4 rounded-xl border bg-gradient-to-r flex items-center gap-3 relative overflow-hidden", accentClass)}>
              {rank === 1 && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5 animate-pulse" />}
              <div className="w-12 h-12 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-base font-black text-primary">#{rank}</span>
              </div>
              <div className="flex-1 min-w-0 relative">
                <p className="text-sm font-bold text-foreground truncate">
                  {rank === 1 ? "👑 You're the king. Stay dangerous." : rank <= 3 ? `🔥 Top 3! ${me.totalPoints.toLocaleString()} pts — keep pushing.` : `Top ${topPct}% — ${me.totalPoints.toLocaleString()} pts`}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  {isWeekly && me.timeThisWeekMinutes > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {me.hoursThisWeek}h this week
                    </span>
                  )}
                  {me.streakDays > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Flame className={cn("w-3 h-3", me.streakDays >= 7 ? "text-orange-500 animate-pulse" : "text-orange-400/70")} />
                      {me.streakDays}d streak
                    </span>
                  )}
                </div>
              </div>
            </div>

            {rival && pointsToNext > 0 && (
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-gradient-to-r from-destructive/10 to-transparent flex items-center gap-3 relative overflow-hidden">
                <div className="p-2 rounded-lg bg-destructive/15 border border-destructive/20">
                  <Target className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0 relative">
                  <p className="text-xs font-black text-foreground">
                    <span className="text-destructive">{pointsToNext.toLocaleString()} pts</span> behind {displayName(rival)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">1 lesson = 100 pts. Close the gap NOW.</p>
                </div>
              </div>
            )}

            {chaser && chaserGap < 300 && chaserGap > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                <p className="text-[11px] text-amber-400 font-bold">
                  ⚠️ {displayName(chaser)} is <span className="text-amber-300">{chaserGap} pts</span> behind — they're coming for your spot
                </p>
              </div>
            )}

            {/* Weekly threshold progress */}
            {isWeekly && me.timeThisWeekMinutes > 0 && (
              <div className="p-3 rounded-xl border border-border/30 bg-muted/20">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Weekly Time Bonus</div>
                {[
                  { min: 210, bonus: 500, label: '30 min/day' },
                  { min: 315, bonus: 1000, label: '45 min/day' },
                  { min: 420, bonus: 1500, label: '60 min/day' },
                ].map(t => {
                  const pct = Math.min(100, Math.round((me.timeThisWeekMinutes / t.min) * 100));
                  const reached = me.timeThisWeekMinutes >= t.min;
                  return (
                    <div key={t.min} className="flex items-center gap-2 mb-1">
                      <div className="flex-1">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", reached ? "bg-success" : "bg-primary/60")} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className={cn("text-[10px] font-bold tabular-nums min-w-[80px] text-right", reached ? "text-success" : "text-muted-foreground")}>
                        {reached ? `✅ +${t.bonus}` : `${me.timeThisWeekMinutes}/${t.min} min`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== PODIUM ===== */}
      {top3.length >= 3 && (
        <div className="relative px-4 pt-10 pb-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/8 via-primary/3 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-yellow-500/10 rounded-full blur-[80px]" />
          <div className="relative flex items-end justify-center gap-4">
            <PodiumSlot entry={top3[1]} rank={2} animateIn={animateIn} delay="200ms" podiumH="h-20"
              podiumGradient="from-gray-400/30 via-gray-400/15 to-transparent" ringColor="ring-gray-400/60"
              medalIcon={<Medal className="w-5 h-5 text-gray-400" />} rankBg="bg-gradient-to-br from-gray-400 to-gray-500"
              onClick={() => setSelectedEntry(top3[1])} />
            <PodiumSlot entry={top3[0]} rank={1} animateIn={animateIn} delay="0ms" podiumH="h-28"
              podiumGradient="from-yellow-500/30 via-yellow-500/10 to-transparent" ringColor="ring-yellow-500/70"
              medalIcon={<Trophy className="w-7 h-7 text-yellow-500" />} rankBg="bg-gradient-to-br from-yellow-400 to-yellow-600"
              isChampion onClick={() => setSelectedEntry(top3[0])} />
            <PodiumSlot entry={top3[2]} rank={3} animateIn={animateIn} delay="400ms" podiumH="h-14"
              podiumGradient="from-amber-600/25 via-amber-600/10 to-transparent" ringColor="ring-amber-600/60"
              medalIcon={<Award className="w-5 h-5 text-amber-600" />} rankBg="bg-gradient-to-br from-amber-500 to-amber-700"
              onClick={() => setSelectedEntry(top3[2])} />
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
                "flex items-center gap-3 px-4 py-3.5 transition-all cursor-pointer group hover:bg-muted/20",
                isCurrentUser && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <div className="w-8 flex justify-center">
                <span className={cn("text-sm font-bold tabular-nums", rank <= 5 ? "text-foreground" : "text-muted-foreground")}>{rank}</span>
              </div>
              <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn("text-sm font-semibold truncate", isCurrentUser ? "text-primary" : "text-foreground")}>
                    {displayName(entry)}
                    {isCurrentUser && <span className="text-xs font-normal ml-1 text-muted-foreground">(You)</span>}
                  </p>
                  {badge && <badge.icon className={cn('w-3.5 h-3.5 flex-shrink-0', badge.color)} />}
                </div>
                {isWeekly && (
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    {entry.streakDays > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-400/70" /> {entry.streakDays}d
                      </span>
                    )}
                    {entry.hoursThisWeek > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-blue-400/70" /> {entry.hoursThisWeek}h
                      </span>
                    )}
                    {entry.lessonsCompleted > 0 && (
                      <span className="flex items-center gap-0.5">
                        <BookOpen className="w-3 h-3 text-primary/60" /> {entry.lessonsCompleted}
                      </span>
                    )}
                  </div>
                )}
                {!isWeekly && entry.teamName && (
                  <p className="text-[10px] text-muted-foreground/60 truncate">{entry.teamName}</p>
                )}
              </div>
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
                  {!isWeekly && ' · All-Time'}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-3 pt-2">
              {isWeekly ? (
                <>
                  {/* Weekly breakdown */}
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Point Breakdown</div>
                  {[
                    { icon: Clock, label: 'Hours Logged', detail: `${selectedEntry.hoursThisWeek} hrs × ${POINTS.HOUR_LOGGED}/hr`, value: selectedEntry.breakdown.hoursPoints, color: 'text-blue-500' },
                    ...(selectedEntry.breakdown.thresholdBonus > 0 ? [{ icon: Zap, label: 'Weekly Threshold Bonus', detail: `${selectedEntry.timeThisWeekMinutes} min this week`, value: selectedEntry.breakdown.thresholdBonus, color: 'text-yellow-500' }] : []),
                    { icon: BookOpen, label: 'Lessons Completed', detail: `${selectedEntry.lessonsCompleted} × ${POINTS.LESSON_COMPLETED}`, value: selectedEntry.breakdown.lessonsPoints, color: 'text-success' },
                    { icon: Video, label: 'Videos Watched', detail: `${POINTS.VIDEO_WATCHED} pts per watch (rewatches count!)`, value: selectedEntry.breakdown.videoPoints, color: 'text-purple-500' },
                    { icon: Flame, label: 'Training Streak', detail: `${selectedEntry.streakDays} days × ${POINTS.STREAK_DAY}/day + milestones`, value: selectedEntry.breakdown.streakPoints, color: 'text-orange-500' },
                    { icon: FileText, label: 'Manual Chapters', detail: `${POINTS.MANUAL_CHAPTER} pts per chapter`, value: selectedEntry.breakdown.manualPoints, color: 'text-teal-500' },
                    { icon: Users, label: 'Weekly 1:1s', detail: `${POINTS.ONE_ON_ONE} pts each`, value: selectedEntry.breakdown.oneOnOnePoints, color: 'text-pink-500' },
                  ].filter(item => item.value > 0).map(({ icon: Icon, label, detail, value, color }) => (
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
                </>
              ) : (
                <>
                  {/* All-time summary */}
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Cumulative Score</p>
                    <p className="text-3xl font-black text-primary">{selectedEntry.totalPoints.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">All-time points across all weeks</p>
                  </div>
                  {selectedEntry.streakDays > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">Current Streak</p>
                        <p className="text-xs text-muted-foreground">{selectedEntry.streakDays} day{selectedEntry.streakDays !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">Total Score</p>
                  <span className="text-2xl font-black text-primary">{selectedEntry.totalPoints.toLocaleString()}</span>
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
      className={cn("flex flex-col items-center transition-all duration-700", animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")}
      style={{ transitionDelay: delay }}
    >
      <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={onClick}>
        <div className={cn("rounded-full p-0.5", isChampion ? "bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600" : "")}>
          <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="lg"
            className={cn("shadow-lg", !isChampion && ringColor, !isChampion && "ring-2", isChampion && "ring-0 !w-16 !h-16")} />
        </div>
        {isChampion ? (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Crown className="w-6 h-6 text-yellow-500 drop-shadow-lg" /></div>
        ) : (
          <div className={cn("absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md", rankBg)}>{rank}</div>
        )}
      </div>
      <p className={cn("font-bold text-foreground mt-2 truncate text-center", isChampion ? "text-sm max-w-[100px]" : "text-xs max-w-[80px]")}>{displayName(entry)}</p>
      <p className={cn("font-black text-primary tabular-nums", isChampion ? "text-xl" : "text-sm")}>{entry.totalPoints.toLocaleString()}</p>
      <span className="text-[9px] text-muted-foreground font-semibold -mt-0.5">PTS</span>
      <div className={cn("rounded-t-xl mt-2 border border-border/30 flex items-end justify-center pb-2", podiumH, `bg-gradient-to-t ${podiumGradient}`, isChampion ? "w-28" : "w-22")}>
        {medalIcon}
      </div>
    </div>
  );
}
