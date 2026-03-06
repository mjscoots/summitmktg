import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CapStatus {
  earned: number;
  max: number;
}

export interface PointsBreakdown {
  weeklyEvents: Record<string, number>;
  weeklyHoursPoints: number;
  weeklyThresholdBonus: number;
  weeklyTotal: number;
  allTimeTotal: number;
  legacyPoints: number;
  capsToday: {
    hours: CapStatus;
    chat: CapStatus;
    lesson: CapStatus;
    video: CapStatus;
    manual: CapStatus;
  };
  timeTodayMinutes: number;
  timeWeekMinutes: number;
  currentStreak: number;
  longestStreak: number;
  nextThreshold: {
    targetMinutes: number | null;
    bonus: number;
    remainingMinutes: number;
  };
}

export function useMyPoints() {
  const { user } = useAuth();
  const [data, setData] = useState<PointsBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      const { data: raw, error } = await (supabase.rpc as any)('get_my_points_breakdown', { _user_id: user.id });
      if (error || !raw) {
        console.error('Points breakdown error:', error);
        return;
      }
      setData({
        weeklyEvents: raw.weekly_events || {},
        weeklyHoursPoints: raw.weekly_hours_points || 0,
        weeklyThresholdBonus: raw.weekly_threshold_bonus || 0,
        weeklyTotal: raw.weekly_total || 0,
        allTimeTotal: raw.all_time_total || 0,
        legacyPoints: raw.legacy_points || 0,
        capsToday: {
          hours: raw.caps_today?.hours || { earned: 0, max: 600 },
          chat: raw.caps_today?.chat || { earned: 0, max: 400 },
          lesson: raw.caps_today?.lesson || { earned: 0, max: 300 },
          video: raw.caps_today?.video || { earned: 0, max: 200 },
          manual: raw.caps_today?.manual || { earned: 0, max: 300 },
        },
        timeTodayMinutes: raw.time_today_minutes || 0,
        timeWeekMinutes: raw.time_week_minutes || 0,
        currentStreak: raw.current_streak || 0,
        longestStreak: raw.longest_streak || 0,
        nextThreshold: {
          targetMinutes: raw.next_threshold?.target_minutes || null,
          bonus: raw.next_threshold?.bonus || 0,
          remainingMinutes: raw.next_threshold?.remaining_minutes || 0,
        },
      });
    } catch (err) {
      console.error('Points error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}
