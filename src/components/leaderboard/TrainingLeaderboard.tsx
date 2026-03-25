import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, GraduationCap, Flame, Clock, BookOpen, Target, Crown, Star, Zap, Activity, Video, FileText, Users, MessageSquare } from 'lucide-react';
import { NextRankPush } from '@/components/leaderboard/NextRankPush';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Progress } from '@/components/ui/progress';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { TeamMember } from '@/lib/hierarchyUtils';

const POINTS = {
  HOUR_LOGGED: 120,
  LESSON_FIRST_3: 60,
  LESSON_NEXT_3: 30,
  LESSON_BEYOND: 10,
  VIDEO_WATCHED: 40,
  STREAK_DAY: 25,
  DAILY_LOGIN: 75,
  CHAT_MESSAGE: 15,
  MANUAL_CHAPTER: 50,
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
    loginPoints: number;
    streakPoints: number;
    chatPoints: number;
    lessonsPoints: number;
    videoPoints: number;
    manualPoints: number;
    reactionPoints: number;
    oneOnOnePoints: number;
    legacyPoints?: number;
  };
  weeklyBadge: string | null;
}

function displayName(entry: LeaderboardEntry) {
  return entry.nickname || entry.full_name.split(' ')[0];
}

const WEEKLY_BADGES: { id: string; icon: typeof Star; label: string; color: string; check: (e: LeaderboardEntry, rank: number) => boolean }[] = [
  { id: 'champion', icon: Crown, label: 'Weekly Champion', color: 'text-primary', check: (_, rank) => rank === 1 },
  { id: 'grinder', icon: Clock, label: 'Grinder (5h+)', color: 'text-blue-500', check: (e) => e.hoursThisWeek >= 5 },
  { id: 'consistent', icon: Flame, label: 'Consistent (7d+)', color: 'text-primary', check: (e) => e.streakDays >= 7 },
  { id: 'social', icon: MessageSquare, label: 'Social', color: 'text-primary', check: (e) => (e.breakdown.chatPoints || 0) >= 200 },
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
          const { data, error } = await (supabase as any).rpc('get_all_time_leaderboard', { _limit: 50 });
          if (error) {
            console.error('All-time leaderboard RPC error:', error);
            if (!isRefresh) setEntries([]);
            setIsLoading(false);
            return;
          }
          if ((!data || data.length === 0) && !isRefresh) {
            console.warn('[Leaderboard] All-time RPC returned empty data — possible BigInt/type issue or no activity recorded');
          }

          leaderboard = (data || []).map((row: any) => ({
            user_id: row.user_id,
            full_name: row.full_name,
            nickname: row.nickname || null,
            avatar_url: row.avatar_url,
            totalPoints: Number(row.total_points) || 0,
            lessonsCompleted: Number(row.lessons_completed) || 0,
            totalLessons: 1,
            streakDays: row.current_streak || 0,
            hoursThisWeek: Math.round((row.total_time_minutes || 0) / 60 * 10) / 10,
            avgQuizScore: 0,
            progressPct: 0,
            isActiveToday: false,
            timeThisWeekMinutes: row.total_time_minutes || 0,
            teamName: row.team_name || null,
            breakdown: {
              hoursPoints: row.new_hours_points || 0,
              thresholdBonus: row.threshold_bonus || 0,
              loginPoints: row.login_points || 0,
              streakPoints: row.streak_points || 0,
              chatPoints: row.chat_points || 0,
              lessonsPoints: row.lesson_points || 0,
              videoPoints: row.video_points || 0,
              manualPoints: row.manual_points || 0,
              reactionPoints: row.reaction_points || 0,
              oneOnOnePoints: row.one_on_one_points || 0,
              legacyPoints: row.legacy_points || 0,
            },
            weeklyBadge: null,
          }));
        } else {
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
                loginPoints: row.login_points || 0,
                streakPoints: row.streak_points || 0,
                chatPoints: row.chat_points || 0,
                lessonsPoints: row.lesson_points || 0,
                videoPoints: row.video_points || 0,
                manualPoints: row.manual_points || 0,
                reactionPoints: row.reaction_points || 0,
                oneOnOnePoints: row.one_on_one_points || 0,
              },
              weeklyBadge: null,
            }));

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

  const getBadgeInfo = (badgeId: string | null) => {
    if (!badgeId) return null;
    return WEEKLY_BADGES.find(b => b.id === badgeId) || null;
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <Trophy className="w-6 h-6 text-primary animate-bounce" />
          <span className="text-muted-foreground text-sm animate-pulse">Loading rankings...</span>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">
          {mode === 'overall' ? 'No all-time activity recorded yet' : 'No activity yet this week'}
        </p>
      </div>
    );
  }

  const top3 = entries.slice(0, Math.min(3, entries.length));
  const rest = entries.slice(3);
  const isWeekly = mode === 'weekly';

  return (
    <div>
      {/* Rank status bar removed for cleaner UX */}

      {/* ===== PODIUM ===== */}
      {top3.length >= 3 && (
        <div className="relative px-4 pt-10 pb-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/5 rounded-full blur-[60px]" />
          <div className="relative flex items-end justify-center gap-4">
            <PodiumSlot entry={top3[1]} rank={2} animateIn={animateIn} delay="200ms" podiumH="h-20"
              podiumGradient="from-gray-400/30 via-gray-400/15 to-transparent" ringColor="ring-gray-400/60"
              medalIcon={<Medal className="w-5 h-5 text-gray-400" />} rankBg="bg-gradient-to-br from-gray-400 to-gray-500"
              onClick={() => setSelectedEntry(top3[1])} />
            <PodiumSlot entry={top3[0]} rank={1} animateIn={animateIn} delay="0ms" podiumH="h-28"
              podiumGradient="from-yellow-500/30 via-yellow-500/10 to-transparent" ringColor="ring-yellow-500/70"
              medalIcon={<Trophy className="w-7 h-7 text-primary" />} rankBg="bg-gradient-to-br from-yellow-400 to-yellow-600"
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
              <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="sm" rank={rank} totalEntries={entries.length} />
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
                        <Flame className={cn("w-3 h-3", entry.streakDays >= 14 ? "text-primary" : entry.streakDays >= 7 ? "text-primary" : entry.streakDays >= 3 ? "text-blue-400" : "text-muted-foreground")} /> {entry.streakDays}d
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

      {/* Player Card Modal */}
      <MemberProfileModal
        member={selectedEntry ? {
          id: selectedEntry.user_id,
          user_id: selectedEntry.user_id,
          full_name: selectedEntry.full_name,
          email: '',
          phone: null,
          status: 'active',
          experience: null,
          direct_manager: null,
          avatar_url: selectedEntry.avatar_url,
          time_this_week_minutes: selectedEntry.timeThisWeekMinutes,
        } as TeamMember : null}
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        roster={[]}
      />
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
          <UserAvatar avatarUrl={entry.avatar_url} fullName={entry.full_name} size="lg" rank={rank} totalEntries={20}
            className={cn("shadow-md", !isChampion && ringColor, !isChampion && "ring-2", isChampion && "ring-0 !w-16 !h-16")} />
        </div>
        {isChampion ? (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Crown className="w-6 h-6 text-primary drop-shadow-md" /></div>
        ) : (
          <div className={cn("absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm", rankBg)}>{rank}</div>
        )}
      </div>
      <p className={cn("font-bold text-foreground mt-2 truncate text-center", isChampion ? "text-base max-w-[110px]" : rank === 2 ? "text-sm max-w-[90px]" : "text-[13px] max-w-[85px]")}>{displayName(entry)}</p>
      <p className={cn("font-black text-primary tabular-nums", isChampion ? "text-xl" : "text-sm")}>{entry.totalPoints.toLocaleString()}</p>
      <span className="text-[9px] text-muted-foreground font-semibold -mt-0.5">PTS</span>
      <div className={cn("rounded-t-xl mt-2 border border-border/30 flex items-end justify-center pb-2", podiumH, `bg-gradient-to-t ${podiumGradient}`, isChampion ? "w-28" : "w-22")}>
        {medalIcon}
      </div>
    </div>
  );
}