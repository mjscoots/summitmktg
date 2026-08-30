import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingList } from '@/components/shared/LoadingList';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Medal, Award, GraduationCap, Flame, Clock, BookOpen, Target, Crown, Star, Zap, Activity, Video, FileText, Users, MessageSquare } from 'lucide-react';
import { NextRankPush } from '@/components/leaderboard/NextRankPush';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { CountUp } from '@/components/shared/CountUp';
import { StreakChip } from '@/components/shared/StreakChip';
import { Progress } from '@/components/ui/progress';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { TeamMember } from '@/lib/hierarchyUtils';
import { RankMark } from '@/components/badges/RankInsignia';
import { useRankLabels } from '@/hooks/useRankLabels';


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
  /** 'summit' ranks everyone; 'team' ranks the signed-in person's team only. */
  scope?: 'summit' | 'team';
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
  { id: 'grinder', icon: Clock, label: 'Grinder (5h+)', color: 'text-primary', check: (e) => e.hoursThisWeek >= 5 },
  { id: 'consistent', icon: Flame, label: 'Consistent (7d+)', color: 'text-primary', check: (e) => e.streakDays >= 7 },
  { id: 'social', icon: MessageSquare, label: 'Social', color: 'text-primary', check: (e) => (e.breakdown.chatPoints || 0) >= 200 },
];

export function TrainingLeaderboard({ mode = 'overall', scope = 'summit' }: TrainingLeaderboardProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const rankLabels = useRankLabels(entries.map((e) => e.user_id));


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
    return <LoadingList rows={6} />;
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={mode === 'overall' ? 'No all-time activity yet' : 'Nothing logged this week'}
        description="Rankings fill in as reps train, log time, and close."
      />
    );
  }

  const isWeekly = mode === 'weekly';
  const myTeam = entries.find((e) => e.user_id === user?.id)?.teamName || null;
  const scoped = scope === 'team' && myTeam ? entries.filter((e) => e.teamName === myTeam) : entries;

  if (scoped.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nothing from your team yet"
        description="Your team appears here once someone logs points."
      />
    );
  }

  // Equal counts share a rank.
  const ranked: { entry: LeaderboardEntry; rank: number }[] = [];
  scoped.forEach((entry, i) => {
    const prev = ranked[i - 1];
    const rank = prev && prev.entry.totalPoints === entry.totalPoints ? prev.rank : i + 1;
    ranked.push({ entry, rank });
  });

  const leaderPoints = ranked[0]?.entry.totalPoints || 1;
  const hasPodium = ranked.length >= 3;
  const top3 = hasPodium ? ranked.slice(0, 3) : [];
  const rest = hasPodium ? ranked.slice(3) : ranked;
  const mine = ranked.find((r) => r.entry.user_id === user?.id) || null;

  const PODIUM = [
    { slot: 1, height: 'min-h-[96px]' },
    { slot: 0, height: 'min-h-[120px]' },
    { slot: 2, height: 'min-h-[84px]' },
  ];

  return (
    <div className="relative">
      {/* Podium */}
      {hasPodium && (
        <div className="relative overflow-hidden px-3 pt-6 pb-4">
          <div className="absolute left-1/2 top-0 h-28 w-56 -translate-x-1/2 rounded-full bg-primary/10 blur-[60px]" />
          <div className="relative grid grid-cols-3 items-end gap-2">
            {PODIUM.map(({ slot, height }) => {
              const row = top3[slot];
              if (!row) return <div key={slot} />;
              const first = row.rank === 1;
              const medal = row.rank <= 3 ? (`medal-${row.rank}` as 'medal-1' | 'medal-2' | 'medal-3') : null;
              return (
                <button
                  key={row.entry.user_id}
                  onClick={() => setSelectedEntry(row.entry)}
                  className={cn(
                    'card-ice flex flex-col items-center justify-end gap-1 px-2 pb-3 pt-3 text-center transition-transform',
                    height,
                    animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
                    'duration-500',
                    medal
                  )}
                  style={{ transitionDelay: `${slot * 80}ms` }}
                >
                  <UserAvatar
                    avatarUrl={row.entry.avatar_url}
                    fullName={row.entry.full_name}
                    size="lg"
                    className={cn('!h-12 !w-12 text-sm sm:!h-14 sm:!w-14 sm:text-base', first ? 'avatar-ring' : 'ring-2 ring-border-strong')}
                  />
                  <span className="flex w-full items-center justify-center gap-1">
                    <span className="min-w-0 truncate text-[12px] font-semibold text-foreground">
                      {displayName(row.entry)}
                    </span>
                    <RankMark rankName={rankLabels[row.entry.user_id]} />
                  </span>

                  <CountUp
                    value={row.entry.totalPoints}
                    className={cn(
                      'block w-full truncate font-display font-extrabold leading-none',
                      first ? 'celebrate-text text-[20px] tracking-tight sm:text-[40px]' : 'text-[17px] tracking-tight sm:text-[26px] text-foreground',
                      !first && medal && `${medal}-text`
                    )}
                  />
                  <span className={cn('text-[10px] font-semibold', medal ? `${medal}-text` : 'text-muted-foreground')}>#{row.rank}</span>

                  {isWeekly && <StreakChip days={row.entry.streakDays} className="mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranks 4 and down */}
      <div className="space-y-1.5 px-3 pb-4">
        {rest.map(({ entry, rank }, index) => {
          const isCurrentUser = entry.user_id === user?.id;
          const pct = Math.max(4, Math.round((entry.totalPoints / leaderPoints) * 100));
          const badge = getBadgeInfo(entry.weeklyBadge);
          return (
            <button
              key={entry.user_id}
              onClick={() => setSelectedEntry(entry)}
              className={cn(
                'card-ice block w-full px-3 py-2.5 text-left transition-colors',
                isCurrentUser && 'border-primary/60 bg-primary/5'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 shrink-0 text-center font-display text-[15px] font-extrabold tabular-nums text-muted-foreground">
                  {rank}
                </span>
                <UserAvatar
                  avatarUrl={entry.avatar_url}
                  fullName={entry.full_name}
                  size="md"
                  className="!h-9 !w-9"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cn('truncate text-[14px] font-semibold', isCurrentUser ? 'text-primary' : 'text-foreground')}>
                      {displayName(entry)}
                      {isCurrentUser && <span className="ml-1 text-[11px] font-normal text-muted-foreground">You</span>}
                    </span>
                    <RankMark rankName={rankLabels[entry.user_id]} />
                    {badge && <badge.icon className={cn('h-3.5 w-3.5 shrink-0', badge.color)} />}
                  </span>

                  <span className="mt-0.5 flex items-center gap-1.5">
                    {entry.teamName && (
                      <span className="truncate text-[11px] text-muted-foreground">{entry.teamName}</span>
                    )}
                    {isWeekly && <StreakChip days={entry.streakDays} className="shrink-0" />}
                  </span>
                </span>
                <span className="shrink-0 font-display text-[16px] font-extrabold tabular-nums text-foreground">
                  {entry.totalPoints.toLocaleString()}
                </span>
              </div>
              <span className="rank-bar mt-2 block">
                <span
                  className="rank-bar-fill"
                  style={{ width: animateIn ? `${pct}%` : '0%', transitionDelay: `${Math.min(index, 8) * 40}ms` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* Sticky own row */}
      {mine && mine.rank > 3 && (
        <div className="sticky bottom-0 z-10 border-t border-primary/30 bg-card/95 px-3 py-2 backdrop-blur">
          <p className="text-[13px] font-semibold text-primary">
            You · #{mine.rank} · {mine.entry.totalPoints.toLocaleString()}
          </p>
        </div>
      )}

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
