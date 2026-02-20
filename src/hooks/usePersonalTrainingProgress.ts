import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getReachableRookieLessonIds } from '@/lib/trainingProgressCalc';

interface CourseProgress {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
}

interface TrainingProgressData {
  overall: number;
  courses: CourseProgress[];
  isComplete: boolean;
}

export function usePersonalTrainingProgress() {
  const { user, role } = useAuth();
  const [progress, setProgress] = useState<TrainingProgressData>({
    overall: 0,
    courses: [],
    isComplete: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const calculateProgress = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const isManagerRole = role === 'manager' || role === 'admin';
      
      // Fetch all courses with their lessons based on role
      const { data: courses } = await supabase
        .from('training_courses')
        .select(`
          id,
          slug,
          title,
          target_role,
          training_modules (
            id,
            is_active,
            training_lessons (
              id,
              is_active
            )
          )
        `)
        .eq('is_active', true)
        .order('display_order');

      if (!courses) {
        setIsLoading(false);
        return;
      }

      // Filter courses based on role
      const relevantCourses = courses.filter(course => {
        if (isManagerRole) {
          return course.target_role === 'rookie' || course.target_role === 'manager' || course.target_role === null;
        }
        return course.target_role === 'rookie' || course.target_role === null;
      });

      // Get all active lesson IDs from these courses (filter modules by is_active too)
      const allLessonIds: string[] = [];
      relevantCourses.forEach(course => {
        course.training_modules?.forEach(module => {
          if (!(module as any).is_active) return; // Skip inactive modules
          module.training_lessons?.forEach(lesson => {
            if (lesson.is_active) {
              allLessonIds.push(lesson.id);
            }
          });
        });
      });

      // Fetch user's completed lessons
      const { data: completedLessons } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      const completedLessonIds = new Set(
        completedLessons?.map(lp => lp.lesson_id) || []
      );

      // Calculate progress per course
      const courseProgress: CourseProgress[] = relevantCourses.map(course => {
        let totalLessons = 0;
        let completedCount = 0;

        course.training_modules?.forEach(module => {
          if (!(module as any).is_active) return; // Skip inactive modules
          module.training_lessons?.forEach(lesson => {
            if (lesson.is_active) {
              totalLessons++;
              if (completedLessonIds.has(lesson.id)) {
                completedCount++;
              }
            }
          });
        });

        return {
          courseId: course.id,
          courseSlug: course.slug,
          courseTitle: course.title,
          completedLessons: completedCount,
          totalLessons,
          percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
        };
      });

      // Calculate overall progress
      let overallProgress = 0;

      if (isManagerRole) {
        const rookieCourses = courseProgress.filter(c => {
          const course = relevantCourses.find(rc => rc.id === c.courseId);
          return course?.target_role === 'rookie' || course?.target_role === null;
        });
        const managerCourses = courseProgress.filter(c => {
          const course = relevantCourses.find(rc => rc.id === c.courseId);
          return course?.target_role === 'manager';
        });

        const rookieTotal = rookieCourses.reduce((sum, c) => sum + c.totalLessons, 0);
        const rookieCompleted = rookieCourses.reduce((sum, c) => sum + c.completedLessons, 0);
        const rookieProgress = rookieTotal > 0 ? (rookieCompleted / rookieTotal) * 100 : 0;

        const managerTotal = managerCourses.reduce((sum, c) => sum + c.totalLessons, 0);
        const managerCompleted = managerCourses.reduce((sum, c) => sum + c.completedLessons, 0);
        const managerProgress = managerTotal > 0 ? (managerCompleted / managerTotal) * 100 : 0;

        if (managerTotal === 0) {
          overallProgress = Math.round(rookieProgress);
        } else {
          overallProgress = Math.round((rookieProgress * 0.6) + (managerProgress * 0.4));
        }
      } else {
        const totalLessons = courseProgress.reduce((sum, c) => sum + c.totalLessons, 0);
        const completedTotal = courseProgress.reduce((sum, c) => sum + c.completedLessons, 0);
        overallProgress = totalLessons > 0 ? Math.round((completedTotal / totalLessons) * 100) : 0;
      }

      setProgress({
        overall: overallProgress,
        courses: courseProgress,
        isComplete: overallProgress === 100,
      });
    } catch (err) {
      console.error('Error calculating training progress:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, role]);

  useEffect(() => {
    calculateProgress();

    if (!user?.id) return;

    const channel = supabase
      .channel('personal_training_progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_progress',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          calculateProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, calculateProgress]);

  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return 'text-green-500';
    if (percentage >= 71) return 'text-primary';
    if (percentage >= 41) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getProgressBgColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500/15 border-green-500/30';
    if (percentage >= 71) return 'bg-primary/15 border-primary/30';
    if (percentage >= 41) return 'bg-yellow-500/15 border-yellow-500/30';
    return 'bg-destructive/15 border-destructive/30';
  };

  return {
    progress,
    isLoading,
    refetch: calculateProgress,
    getProgressColor,
    getProgressBgColor,
  };
}
