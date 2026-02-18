import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  totalDaysActive: number;
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: null,
  totalDaysActive: 0,
};

const STREAK_MILESTONES = [1, 3, 7, 14, 21, 30, 60, 90];

export function useStreak() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>(DEFAULT_STREAK_DATA);
  const [newMilestone, setNewMilestone] = useState<number | null>(null);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const hasRecordedRef = useRef(false);

  // Record daily login via DB function
  useEffect(() => {
    if (!user?.id || hasRecordedRef.current) return;
    hasRecordedRef.current = true;

    const recordLogin = async () => {
      try {
        const { data, error } = await supabase.rpc('record_daily_login', {
          _user_id: user.id,
        });

        if (error) {
          console.error('Streak recording error:', error);
          return;
        }

        const result = data as {
          current_streak: number;
          longest_streak: number;
          points_awarded: number;
          milestone: string | null;
          already_recorded: boolean;
        };

        setStreakData({
          currentStreak: result.current_streak,
          longestStreak: result.longest_streak,
          lastLoginDate: new Date().toISOString().split('T')[0],
          totalDaysActive: result.current_streak, // approximation
        });

        if (!result.already_recorded) {
          setPointsAwarded(result.points_awarded);

          if (result.current_streak > 1) {
            setShowStreakCelebration(true);
          }

          if (result.milestone) {
            // Extract milestone number from milestone text
            const milestoneMatch = result.milestone.match(/^(\d+)/);
            if (milestoneMatch) {
              setNewMilestone(parseInt(milestoneMatch[1]));
            }
          }
        }
      } catch (err) {
        console.debug('Streak recording failed:', err);
      }
    };

    recordLogin();
  }, [user?.id]);

  const clearMilestone = useCallback(() => {
    setNewMilestone(null);
  }, []);

  const clearStreakCelebration = useCallback(() => {
    setShowStreakCelebration(false);
  }, []);

  const getStreakMessage = useCallback(() => {
    const { currentStreak } = streakData;
    if (currentStreak === 0) return "Start your journey today!";
    if (currentStreak === 1) return "Day 1 — You showed up. That's everything.";
    if (currentStreak === 2) return "Day 2 — Momentum is building.";
    if (currentStreak === 3) return "Day 3 — You're becoming consistent. +50 bonus pts!";
    if (currentStreak <= 7) return `Day ${currentStreak} — You're proving yourself.`;
    if (currentStreak === 7) return `7-day streak! +150 bonus pts 🔥`;
    if (currentStreak <= 14) return `${currentStreak} days — You're in the top 10%.`;
    if (currentStreak === 14) return `14-day streak! +300 bonus pts 🔥`;
    if (currentStreak <= 21) return `${currentStreak} days — Elite discipline.`;
    if (currentStreak === 21) return `21-day streak! +500 bonus pts 🔥`;
    if (currentStreak === 30) return `30-day streak! +1000 bonus pts 🔥🔥`;
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
  };
}
