import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        // Get total lesson count
        const { count: totalLessons } = await supabase
          .from('training_lessons')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Get completed lessons per user
        const { data: lessonProgress } = await supabase
          .from('lesson_progress')
          .select('user_id, lesson_id, completed_at')
          .in('user_id', userIds)
          .not('completed_at', 'is', null);

        // Build progress map
        const progressMap = new Map<string, MemberTrainingProgress>();
        const total = totalLessons || 0;

        // Initialize all users with 0 progress
        userIds.forEach(userId => {
          progressMap.set(userId, {
            user_id: userId,
            completed: 0,
            total,
            percentage: 0,
          });
        });

        // Count completed lessons per user
        if (lessonProgress) {
          const completedByUser = new Map<string, Set<string>>();
          
          lessonProgress.forEach(lp => {
            if (!completedByUser.has(lp.user_id)) {
              completedByUser.set(lp.user_id, new Set());
            }
            completedByUser.get(lp.user_id)!.add(lp.lesson_id);
          });

          completedByUser.forEach((lessons, userId) => {
            const completed = lessons.size;
            progressMap.set(userId, {
              user_id: userId,
              completed,
              total,
              percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            });
          });
        }

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
    if (percentage >= 34) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getProgressBgColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-success/15';
    if (percentage >= 67) return 'bg-primary/15';
    if (percentage >= 34) return 'bg-yellow-500/15';
    return 'bg-destructive/15';
  };

  return { progress, isLoading, getProgress, getProgressColor, getProgressBgColor };
}
