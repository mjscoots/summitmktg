import { useState, useEffect } from 'react';
import { getReachableRookieTrainingItems, getCompletedTrainingCounts } from '@/lib/trainingProgressCalc';

export interface MemberTrainingProgress {
  user_id: string;
  completed: number;
  total: number;
  percentage: number;
}

export function useTrainingProgress(userIds: string[]) {
  const [progress, setProgress] = useState<Map<string, MemberTrainingProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userIds.length === 0) return;

    const fetchProgress = async () => {
      setIsLoading(true);
      try {
        const items = await getReachableRookieTrainingItems();
        const totalItems = items.totalCount;
        const completedCounts = await getCompletedTrainingCounts(userIds, items);

        const progressMap = new Map<string, MemberTrainingProgress>();

        userIds.forEach(userId => {
          const completed = completedCounts.get(userId) || 0;
          progressMap.set(userId, {
            user_id: userId,
            completed,
            total: totalItems,
            percentage: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0,
          });
        });

        setProgress(progressMap);
      } catch (err) {
        console.error('Error fetching training progress:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [userIds.join(',')]);

  const getProgress = (userId: string): MemberTrainingProgress => {
    return progress.get(userId) || { user_id: userId, completed: 0, total: 0, percentage: 0 };
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return 'text-success';
    if (percentage >= 67) return 'text-primary';
    if (percentage >= 34) return 'text-primary';
    return 'text-destructive';
  };

  const getProgressBgColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-success/15';
    if (percentage >= 67) return 'bg-primary/15';
    if (percentage >= 34) return 'bg-primary/15';
    return 'bg-destructive/15';
  };

  return { progress, isLoading, getProgress, getProgressColor, getProgressBgColor };
}
