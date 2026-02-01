import { useState, useEffect, useCallback } from 'react';

const STREAK_STORAGE_KEY = 'summit_daily_streak';
const LAST_ACTIVITY_KEY = 'summit_last_activity';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  totalDaysActive: number;
  milestones: number[];
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  totalDaysActive: 0,
  milestones: [],
};

// Milestone definitions
const STREAK_MILESTONES = [1, 3, 7, 14, 21, 30, 60, 90];

export function useStreak() {
  const [streakData, setStreakData] = useState<StreakData>(DEFAULT_STREAK_DATA);
  const [newMilestone, setNewMilestone] = useState<number | null>(null);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);

  // Load streak data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STREAK_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as StreakData;
        // Check if streak is still valid (within 24 hours of last activity)
        if (data.lastActivityDate) {
          const lastDate = new Date(data.lastActivityDate);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff > 1) {
            // Streak broken - reset current streak but keep longest
            setStreakData({
              ...data,
              currentStreak: 0,
            });
          } else {
            setStreakData(data);
          }
        } else {
          setStreakData(data);
        }
      } catch (e) {
        setStreakData(DEFAULT_STREAK_DATA);
      }
    }
  }, []);

  // Record activity (call this when user completes a lesson, views content, etc.)
  const recordActivity = useCallback(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    setStreakData(prev => {
      // Already recorded today
      if (prev.lastActivityDate === today) {
        return prev;
      }

      const lastDate = prev.lastActivityDate ? new Date(prev.lastActivityDate) : null;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = prev.currentStreak;
      
      if (!lastDate) {
        // First activity ever - start streak at 1
        newStreak = 1;
        setShowStreakCelebration(true);
      } else if (prev.lastActivityDate === yesterdayStr) {
        // Continuing streak
        newStreak = prev.currentStreak + 1;
        setShowStreakCelebration(true);
      } else {
        // Streak broken, restart at 1
        newStreak = 1;
      }

      const newLongest = Math.max(prev.longestStreak, newStreak);
      
      // Check for new milestones
      const newMilestones = STREAK_MILESTONES.filter(
        m => m <= newStreak && !prev.milestones.includes(m)
      );
      
      if (newMilestones.length > 0) {
        setNewMilestone(newMilestones[newMilestones.length - 1]);
      }

      const newData: StreakData = {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: today,
        totalDaysActive: prev.totalDaysActive + 1,
        milestones: [...prev.milestones, ...newMilestones],
      };

      // Persist to localStorage
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(newData));
      
      return newData;
    });
  }, []);

  // Clear milestone celebration
  const clearMilestone = useCallback(() => {
    setNewMilestone(null);
  }, []);

  // Clear streak celebration
  const clearStreakCelebration = useCallback(() => {
    setShowStreakCelebration(false);
  }, []);

  // Get motivational message based on streak
  const getStreakMessage = useCallback(() => {
    const { currentStreak } = streakData;
    
    if (currentStreak === 0) {
      return "Start your journey today!";
    } else if (currentStreak === 1) {
      return "Day 1 — You showed up. That's everything.";
    } else if (currentStreak === 2) {
      return "Day 2 — Momentum is building.";
    } else if (currentStreak === 3) {
      return "Day 3 — You're becoming consistent.";
    } else if (currentStreak <= 7) {
      return `Day ${currentStreak} — You're proving yourself.`;
    } else if (currentStreak <= 14) {
      return `${currentStreak} days — You're in the top 10%.`;
    } else if (currentStreak <= 30) {
      return `${currentStreak} days — Elite discipline.`;
    } else {
      return `${currentStreak} days — Unstoppable.`;
    }
  }, [streakData]);

  return {
    streakData,
    recordActivity,
    newMilestone,
    clearMilestone,
    showStreakCelebration,
    clearStreakCelebration,
    getStreakMessage,
  };
}
