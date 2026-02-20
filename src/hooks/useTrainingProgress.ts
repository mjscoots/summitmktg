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
        // Get lessons only from active courses → active modules → active lessons
        // This avoids counting orphaned lessons not reachable through the course tree
        const { data: courses } = await supabase
          .from('training_courses')
          .select(`
            id,
            target_role,
            training_modules (
              id,
              training_lessons (
                id
              )
            )
          `)
          .eq('is_active', true);

        // Collect all reachable lesson IDs (only from rookie/null-targeted courses)
        const reachableLessonIds = new Set<string>();
        (courses || []).forEach(course => {
          // Only count rookie-accessible courses (target_role is null or 'rookie')
          if (course.target_role !== null && course.target_role !== 'rookie') return;
          course.training_modules?.forEach(mod => {
            mod.training_lessons?.forEach(lesson => {
              reachableLessonIds.add(lesson.id);
            });
          });
        });

        const totalLessons = reachableLessonIds.size;

        // Get completed lessons per user (only counting reachable lessons)
        const { data: lessonProgress } = await supabase
          .from('lesson_progress')
          .select('user_id, lesson_id, completed_at')
          .in('user_id', userIds)
          .not('completed_at', 'is', null);

        // Build progress map
        const progressMap = new Map<string, MemberTrainingProgress>();

        // Initialize all users with 0 progress
        userIds.forEach(userId => {
          progressMap.set(userId, {
            user_id: userId,
            completed: 0,
            total: totalLessons,
            percentage: 0,
          });
        });

        // Count completed lessons per user (only reachable ones)
        if (lessonProgress) {
          const completedByUser = new Map<string, Set<string>>();
          
          lessonProgress.forEach(lp => {
            // Only count if the lesson is in a reachable course
            if (!reachableLessonIds.has(lp.lesson_id)) return;
            
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
              total: totalLessons,
              percentage: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
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
