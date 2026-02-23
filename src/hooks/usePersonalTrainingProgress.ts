import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ModuleWithLessons {
  id: string;
  is_active: boolean;
  training_lessons: { id: string; is_active: boolean }[] | null;
}

interface CourseWithModules {
  id: string;
  slug: string;
  title: string;
  target_role: string | null;
  training_modules: ModuleWithLessons[] | null;
}

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

      // Fetch courses, lesson progress, required videos, and video progress in parallel
      const [coursesRes, lessonProgressRes, requiredVideosRes, videoProgressRes] = await Promise.all([
        supabase
          .from('training_courses')
          .select(`
            id, slug, title, target_role,
            training_modules (
              id, is_active,
              training_lessons ( id, is_active )
            )
          `)
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null),
        supabase
          .from('training_videos')
          .select('id')
          .eq('is_active', true)
          .eq('is_required', true),
        supabase
          .from('video_progress')
          .select('video_id')
          .eq('user_id', user.id)
          .eq('watched', true),
      ]);

      const courses = coursesRes.data as CourseWithModules[] | null;
      if (!courses) {
        setIsLoading(false);
        return;
      }

      const completedLessonIds = new Set(
        lessonProgressRes.data?.map(lp => lp.lesson_id) || []
      );
      const requiredVideoIds = new Set(
        requiredVideosRes.data?.map(v => v.id) || []
      );
      const watchedVideoIds = new Set(
        videoProgressRes.data?.map(vp => vp.video_id) || []
      );

      console.log('Video Progress Debug:', {
        userId: user.id,
        videoProgressRaw: videoProgressRes.data,
        videoProgressError: videoProgressRes.error,
        watchedVideoIdsCount: watchedVideoIds.size,
        requiredVideoIdsCount: requiredVideoIds.size,
        requiredVideoIdsSample: Array.from(requiredVideoIds).slice(0, 3),
        watchedVideoIdsSample: Array.from(watchedVideoIds).slice(0, 3),
      });

      // Count watched required videos
      let completedVideoCount = 0;
      requiredVideoIds.forEach(id => {
        if (watchedVideoIds.has(id)) completedVideoCount++;
      });

      // Filter courses based on role
      const relevantCourses = courses.filter(course => {
        if (isManagerRole) {
          return course.target_role === 'rookie' || course.target_role === 'manager' || course.target_role === null;
        }
        return course.target_role === 'rookie' || course.target_role === null;
      });

      // Calculate progress per course (lesson-based)
      const courseProgress: CourseProgress[] = relevantCourses.map(course => {
        let totalLessons = 0;
        let completedCount = 0;

        course.training_modules?.forEach(module => {
          if (!module.is_active) return;
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

      // Debug logging
      const totalLessonsDebug = courseProgress.reduce((sum, c) => sum + c.totalLessons, 0);
      const completedLessonsDebug = courseProgress.reduce((sum, c) => sum + c.completedLessons, 0);
      console.log('Training Progress Debug:', {
        role,
        isManagerRole,
        coursesFound: relevantCourses.length,
        courseDetails: courseProgress.map(c => ({ slug: c.courseSlug, total: c.totalLessons, completed: c.completedLessons, pct: c.percentage })),
        activeLessons: totalLessonsDebug,
        completedLessons: completedLessonsDebug,
        requiredVideos: requiredVideoIds.size,
        watchedRequiredVideos: completedVideoCount,
        totalItems: totalLessonsDebug + requiredVideoIds.size,
        totalCompleted: completedLessonsDebug + completedVideoCount,
      });

      // Calculate overall progress including required videos
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

        // Rookie progress includes required videos (matching canonical calc)
        const rookieLessonTotal = rookieCourses.reduce((sum, c) => sum + c.totalLessons, 0);
        const rookieLessonCompleted = rookieCourses.reduce((sum, c) => sum + c.completedLessons, 0);
        const rookieTotal = rookieLessonTotal + requiredVideoIds.size;
        const rookieCompleted = rookieLessonCompleted + completedVideoCount;
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
        // Rookie overall: lessons + required videos (matching canonical calc)
        const totalLessons = courseProgress.reduce((sum, c) => sum + c.totalLessons, 0);
        const completedTotal = courseProgress.reduce((sum, c) => sum + c.completedLessons, 0);
        const total = totalLessons + requiredVideoIds.size;
        const completed = completedTotal + completedVideoCount;
        overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
      }

      console.log('Training Progress Result:', { overallProgress, isComplete: overallProgress === 100 });

      // Post bot shoutout when training hits 100%
      if (overallProgress === 100 && user?.id) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();
          if (prof?.full_name) {
            const { postBotShoutout } = await import('@/lib/botShoutout');
            postBotShoutout(user.id, prof.full_name, 'training');
          }
        } catch { /* non-critical */ }
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
