import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { postBotShoutout } from '@/lib/botShoutout';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  totalDaysActive: number;
  previousStreak: number;
  restoresRemaining: number;
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: null,
  totalDaysActive: 0,
  previousStreak: 0,
  restoresRemaining: 3,
};

export function useStreak() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>(DEFAULT_STREAK_DATA);
  const [newMilestone, setNewMilestone] = useState<number | null>(null);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const hasRecordedRef = useRef(false);

  // Always load existing streak data on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadStreak = async () => {
      try {
        const { data: streakRow } = await supabase
          .from('daily_login_streaks')
          .select('current_streak, longest_streak, total_days_active, last_login_date, previous_streak, streak_restores_remaining')
          .eq('user_id', user.id)
          .single();

        if (streakRow) {
          setStreakData({
            currentStreak: streakRow.current_streak,
            longestStreak: streakRow.longest_streak,
            lastLoginDate: streakRow.last_login_date,
            totalDaysActive: streakRow.total_days_active,
            previousStreak: (streakRow as any).previous_streak ?? 0,
            restoresRemaining: (streakRow as any).streak_restores_remaining ?? 3,
          });
        }
      } catch { /* no streak row yet */ }
    };

    loadStreak();
  }, [user?.id]);

  // Record daily login via DB function
  useEffect(() => {
    if (!user?.id || hasRecordedRef.current) return;
    hasRecordedRef.current = true;

    const recordLogin = async () => {
      try {
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
        const { data, error } = await supabase.rpc('record_daily_login', {
          _user_id: user.id,
          _timezone: userTz,
        });

        if (error) {
          console.error('[Streak] Recording error:', error);
          return;
        }

        const result = data as {
          current_streak: number;
          longest_streak: number;
          points_awarded: number;
          milestone: string | null;
          already_recorded: boolean;
        };

        // Fetch actual data from DB (includes restore fields)
        let totalDaysActive = result.current_streak;
        let previousStreak = 0;
        let restoresRemaining = 3;
        try {
          const { data: streakRow } = await supabase
            .from('daily_login_streaks')
            .select('total_days_active, previous_streak, streak_restores_remaining')
            .eq('user_id', user.id)
            .single();
          if (streakRow) {
            totalDaysActive = streakRow.total_days_active;
            previousStreak = (streakRow as any).previous_streak ?? 0;
            restoresRemaining = (streakRow as any).streak_restores_remaining ?? 3;
          }
        } catch { /* use fallback */ }

        setStreakData({
          currentStreak: result.current_streak,
          longestStreak: result.longest_streak,
          lastLoginDate: new Date().toISOString().split('T')[0],
          totalDaysActive,
          previousStreak,
          restoresRemaining,
        });

        if (!result.already_recorded) {
          setPointsAwarded(result.points_awarded);

          if (result.current_streak > 1) {
            setShowStreakCelebration(true);
          }

          if (result.milestone) {
            const milestoneMatch = result.milestone.match(/^(\d+)/);
            if (milestoneMatch) {
              setNewMilestone(parseInt(milestoneMatch[1]));
            }

            try {
              await supabase.from('user_notifications').insert({
                user_id: user.id,
                title: `\u{1F525} ${result.milestone}`,
                message: `You've logged in ${result.current_streak} days in a row. Keep the fire burning!`,
                link: '/app/leaderboard',
              });
            } catch { /* ignore */ }

            if (result.current_streak >= 7) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', user.id)
                .single();
              if (prof?.full_name) {
                postBotShoutout(user.id, prof.full_name, 'streak', { streakDays: result.current_streak });
              }
            }
          }
        }
      } catch (err) {
        console.error('Streak recording failed:', err);
      }
    };

    recordLogin();
  }, [user?.id]);

  const restoreStreak = useCallback(async () => {
    if (!user?.id || isRestoring) return false;
    setIsRestoring(true);
    try {
      const { data, error } = await (supabase.rpc as any)('restore_streak', { _user_id: user.id });
      if (error || !data?.success) {
        console.error('[Streak] Restore failed:', error || data?.error);
        setIsRestoring(false);
        return false;
      }

      setStreakData(prev => ({
        ...prev,
        currentStreak: data.restored_streak,
        previousStreak: 0,
        restoresRemaining: data.restores_remaining,
        lastLoginDate: new Date().toISOString().split('T')[0],
        longestStreak: Math.max(prev.longestStreak, data.restored_streak),
      }));

      setShowStreakCelebration(true);
      setIsRestoring(false);
      return true;
    } catch (err) {
      console.error('Streak restore failed:', err);
      setIsRestoring(false);
      return false;
    }
  }, [user?.id, isRestoring]);

  const clearMilestone = useCallback(() => {
    setNewMilestone(null);
  }, []);

  const clearStreakCelebration = useCallback(() => {
    setShowStreakCelebration(false);
  }, []);

  const getStreakMessage = useCallback(() => {
    const { currentStreak } = streakData;
    if (currentStreak === 0) return "Start your journey today.";
    if (currentStreak === 1) return "Day 1 — You showed up. That's everything.";
    if (currentStreak === 2) return "Day 2 — Momentum is building.";
    if (currentStreak === 3) return "3-day streak — You're becoming consistent. +50 bonus pts";
    if (currentStreak <= 6) return `Day ${currentStreak} — You're proving yourself.`;
    if (currentStreak === 7) return "7-day streak — One week strong. +150 bonus pts";
    if (currentStreak <= 13) return `${currentStreak} days — You're in the top 10%.`;
    if (currentStreak === 14) return "14-day streak — Two weeks dominant. +300 bonus pts";
    if (currentStreak <= 20) return `${currentStreak} days — Elite discipline.`;
    if (currentStreak === 21) return "21-day streak — Habit formed. +500 bonus pts";
    if (currentStreak === 30) return "30-day streak — Legendary. +1000 bonus pts";
    return `${currentStreak} days — Unstoppable.`;
  }, [streakData]);

  // Keep recordActivity for backward compat (now a no-op since login auto-records)
  const recordActivity = useCallback(() => {}, []);

  return {
    streakData,
    recordActivity,
    newMilestone,
    clearMilestone,
    showStreakCelebration,
    clearStreakCelebration,
    getStreakMessage,
    pointsAwarded,
    restoreStreak,
    isRestoring,
  };
}
