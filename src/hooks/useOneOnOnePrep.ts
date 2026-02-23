import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getReachableRookieTrainingItems, getCompletedTrainingCounts } from '@/lib/trainingProgressCalc';
import { startOfWeek, subWeeks, format, differenceInDays } from 'date-fns';

export interface PrepRep {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  team_id: string | null;
  team_name: string | null;
  status: string;
  trainingProgress: number;
  totalItems: number;
  completedItems: number;
  lastWeekMinutes: number;
  lastWeekDaysActive: number;
  weekBeforeMinutes: number;
  weekBeforeDaysActive: number;
  lastWeekDailyMinutes: number[]; // Mon-Sun (7 items)
  weekBeforeDailyMinutes: number[];
  lastWeekProgressGain: number;
  weekBeforeProgressGain: number;
  lastWeekCompletedLessons: { id: string; title: string }[];
  lastWeekCompletedVideos: { id: string; title: string }[];
  peerRank: number;
  peerTotal: number;
  teamAvgMinutes: number;
  needsAttention: boolean;
  attentionReasons: string[];
  last_active_at: string | null;
}

export function useOneOnOnePrep(filterRole: 'rookie' | 'manager' = 'rookie') {
  const { user, profile, role } = useAuth();
  const [reps, setReps] = useState<PrepRep[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);

  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';

  // Calculate date ranges
  const now = new Date();
  const lastMonday = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  const weekBeforeMonday = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
  const weekBeforeSunday = new Date(weekBeforeMonday);
  weekBeforeSunday.setDate(weekBeforeSunday.getDate() + 6);

  const lastMondayStr = format(lastMonday, 'yyyy-MM-dd');
  const lastSundayStr = format(lastSunday, 'yyyy-MM-dd');
  const weekBeforeMondayStr = format(weekBeforeMonday, 'yyyy-MM-dd');
  const weekBeforeSundayStr = format(weekBeforeSunday, 'yyyy-MM-dd');

  useEffect(() => {
    if (!user || !isManager) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [user, profile, isManager, filterRole]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Get team info and members
      let teamId = profile?.team_id;
      let isPillarOwner = false;
      let tName = '';

      if (teamId) {
        const { data: team } = await supabase
          .from('teams')
          .select('id, name, leader_id')
          .eq('id', teamId)
          .maybeSingle();
        if (team) {
          isPillarOwner = team.leader_id === user!.id;
          tName = team.name;
        }
      }

      let query = supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, team_id, status, last_active_at')
        .neq('status', 'nlc')
        .neq('user_id', user!.id); // exclude self

      if (isPillarOwner && teamId) {
        query = query.eq('team_id', teamId);
      } else if (profile?.full_name) {
        query = query.eq('direct_manager', profile.full_name);
        tName = `${profile.full_name.split(' ')[0]}'s Team`;
      }

      setTeamName(tName);
      const { data: members } = await query.order('full_name');
      if (!members || members.length === 0) {
        setReps([]);
        setLoading(false);
        return;
      }

      // Filter by role
      const memberIds = members.map(m => m.user_id);
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', memberIds);
      const roleMap = new Map((userRoles || []).map(r => [r.user_id, r.role as string]));

      const filteredMembers = members.filter(m => {
        const memberRole = roleMap.get(m.user_id) || 'rookie';
        if (filterRole === 'rookie') return memberRole === 'rookie';
        if (filterRole === 'manager') return memberRole === 'manager' || memberRole === 'admin';
        return true;
      });

      if (filteredMembers.length === 0) {
        setReps([]);
        setLoading(false);
        return;
      }

      const userIds = filteredMembers.map(m => m.user_id);

      // 2. Get training progress
      const trainingItems = await getReachableRookieTrainingItems();
      const completedCounts = await getCompletedTrainingCounts(userIds, trainingItems);

      // 3. Get daily training time for last 2 weeks
      const { data: dailyTime } = await supabase
        .from('daily_training_time')
        .select('user_id, date, total_minutes')
        .in('user_id', userIds)
        .gte('date', weekBeforeMondayStr)
        .lte('date', lastSundayStr);

      // 4. Get completed lessons last week
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, completed_at')
        .in('user_id', userIds)
        .not('completed_at', 'is', null)
        .gte('completed_at', lastMondayStr)
        .lte('completed_at', lastSundayStr + 'T23:59:59');

      // Get lesson titles
      const lessonIds = [...new Set((lessonProgress || []).map(l => l.lesson_id))];
      const { data: lessonDetails } = lessonIds.length > 0
        ? await supabase.from('training_lessons').select('id, title').in('id', lessonIds)
        : { data: [] };
      const lessonTitleMap = new Map((lessonDetails || []).map(l => [l.id, l.title]));

      // 5. Get team names
      const teamIds = [...new Set(members.map(m => m.team_id).filter(Boolean))];
      const { data: teams } = teamIds.length > 0
        ? await supabase.from('teams').select('id, name').in('id', teamIds as string[])
        : { data: [] };
      const teamNameMap = new Map((teams || []).map(t => [t.id, t.name]));

      // Build per-user aggregates
      const buildDailyArray = (userId: string, mondayStr: string): number[] => {
        const arr = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
        const monday = new Date(mondayStr + 'T00:00:00');
        (dailyTime || [])
          .filter(d => d.user_id === userId)
          .forEach(d => {
            const dayDate = new Date(d.date + 'T00:00:00');
            const diff = Math.round((dayDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
            if (diff >= 0 && diff < 7) arr[diff] = d.total_minutes;
          });
        return arr;
      };

      // Calculate ranks by last week total hours
      const lastWeekTotals = new Map<string, number>();
      userIds.forEach(uid => {
        const daily = buildDailyArray(uid, lastMondayStr);
        lastWeekTotals.set(uid, daily.reduce((a, b) => a + b, 0));
      });
      const sorted = [...lastWeekTotals.entries()].sort((a, b) => b[1] - a[1]);
      const rankMap = new Map<string, number>();
      sorted.forEach(([uid], i) => rankMap.set(uid, i + 1));

      const teamAvg = userIds.length > 0
        ? sorted.reduce((sum, [, mins]) => sum + mins, 0) / userIds.length
        : 0;

      const preppedReps: PrepRep[] = filteredMembers.map(m => {
        const completed = completedCounts.get(m.user_id) || 0;
        const progress = trainingItems.totalCount > 0
          ? Math.round((completed / trainingItems.totalCount) * 100)
          : 0;

        const lastWeekDaily = buildDailyArray(m.user_id, lastMondayStr);
        const weekBeforeDaily = buildDailyArray(m.user_id, weekBeforeMondayStr);
        const lastWeekMins = lastWeekDaily.reduce((a, b) => a + b, 0);
        const weekBeforeMins = weekBeforeDaily.reduce((a, b) => a + b, 0);
        const lastWeekDays = lastWeekDaily.filter(d => d > 0).length;
        const weekBeforeDays = weekBeforeDaily.filter(d => d > 0).length;

        const userLessons = (lessonProgress || [])
          .filter(l => l.user_id === m.user_id)
          .map(l => ({ id: l.lesson_id, title: lessonTitleMap.get(l.lesson_id) || 'Unknown' }));

        // Attention flags
        const attentionReasons: string[] = [];
        if (lastWeekMins === 0) attentionReasons.push('No activity last week');
        else if (lastWeekMins / 7 < 20) attentionReasons.push('Below 20min/day average');
        if (lastWeekDays < 3 && lastWeekMins > 0) attentionReasons.push('Less than 3 days active');

        return {
          user_id: m.user_id,
          full_name: m.full_name,
          email: m.email,
          avatar_url: m.avatar_url,
          team_id: m.team_id,
          team_name: m.team_id ? teamNameMap.get(m.team_id) || null : null,
          status: m.status || 'active',
          trainingProgress: progress,
          totalItems: trainingItems.totalCount,
          completedItems: completed,
          lastWeekMinutes: lastWeekMins,
          lastWeekDaysActive: lastWeekDays,
          weekBeforeMinutes: weekBeforeMins,
          weekBeforeDaysActive: weekBeforeDays,
          lastWeekDailyMinutes: lastWeekDaily,
          weekBeforeDailyMinutes: weekBeforeDaily,
          lastWeekProgressGain: 0, // simplified - would need snapshot data
          weekBeforeProgressGain: 0,
          lastWeekCompletedLessons: userLessons,
          lastWeekCompletedVideos: [], // can be expanded
          peerRank: rankMap.get(m.user_id) || 0,
          peerTotal: userIds.length,
          teamAvgMinutes: teamAvg,
          needsAttention: attentionReasons.length > 0,
          attentionReasons,
          last_active_at: m.last_active_at,
        };
      });

      // Sort: needs attention first (by total mins asc), then on track (by total mins desc)
      preppedReps.sort((a, b) => {
        if (a.needsAttention && !b.needsAttention) return -1;
        if (!a.needsAttention && b.needsAttention) return 1;
        if (a.needsAttention && b.needsAttention) return a.lastWeekMinutes - b.lastWeekMinutes;
        return b.lastWeekMinutes - a.lastWeekMinutes;
      });

      setReps(preppedReps);
    } catch (err) {
      console.error('Error loading 1:1 prep data:', err);
    } finally {
      setLoading(false);
    }
  }

  const needsAttention = reps.filter(r => r.needsAttention);
  const onTrack = reps.filter(r => !r.needsAttention);

  return {
    reps,
    needsAttention,
    onTrack,
    teamName,
    loading,
    lastMonday,
    lastSunday,
    weekBeforeMonday,
    weekBeforeSunday,
    refresh: fetchData,
  };
}
