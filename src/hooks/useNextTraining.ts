import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { verticalFilter } from '@/lib/workspaceScope';

export interface NextTrainingItem {
  kind: 'lesson' | 'mastery';
  courseSlug: string;
  courseTitle: string;
  moduleTitle: string;
  /** Lesson title, or the chapter title for a mastery check. */
  title: string;
  route: string;
}

const ROOKIE_SLUGS = ['learn-your-pitch', 'summer-sales-manual'];
const MANAGER_SLUGS = ['manager-manual', 'management-basics'];

interface LessonRow {
  id: string;
  title: string;
  display_order: number;
  is_active: boolean;
}
interface ModuleRow {
  id: string;
  title: string;
  display_order: number;
  is_active: boolean;
  training_lessons: LessonRow[] | null;
}
interface CourseRow {
  id: string;
  slug: string;
  title: string;
  display_order: number;
  training_modules: ModuleRow[] | null;
}

/**
 * Pass 101 - the one thing the rep should open next: the first unfinished
 * required lesson, or the mastery check of a finished chapter.
 */
export function useNextTraining(track: 'rookie' | 'manager' = 'rookie') {
  const { user } = useAuth();
  const { activeVertical } = useWorkspace();
  const [next, setNext] = useState<NextTrainingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const slugs = track === 'manager' ? MANAGER_SLUGS : ROOKIE_SLUGS;
      const [coursesRes, progressRes, masteryRes] = await Promise.all([
        supabase
          .from('training_courses')
          .select(`id, slug, title, display_order,
            training_modules ( id, title, display_order, is_active,
              training_lessons ( id, title, display_order, is_active ) )`)
          .eq('is_active', true)
          .or(verticalFilter(activeVertical))
          .in('slug', slugs)
          .order('display_order'),
        supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null),
        (supabase as any).from('mastery_checks').select('module_id').eq('user_id', user.id),
      ]);

      const done = new Set((progressRes.data || []).map((p) => p.lesson_id));
      const mastered = new Set(((masteryRes?.data as { module_id: string }[]) || []).map((m) => m.module_id));

      const courses = ((coursesRes.data as unknown as CourseRow[]) || [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order);

      let found: NextTrainingItem | null = null;
      let masteryFallback: NextTrainingItem | null = null;

      for (const course of courses) {
        const modules = (course.training_modules || [])
          .filter((m) => m.is_active)
          .sort((a, b) => a.display_order - b.display_order);
        for (const mod of modules) {
          const lessons = (mod.training_lessons || [])
            .filter((l) => l.is_active)
            .sort((a, b) => a.display_order - b.display_order);
          const nextLesson = lessons.find((l) => !done.has(l.id));
          if (nextLesson) {
            found = {
              kind: 'lesson',
              courseSlug: course.slug,
              courseTitle: course.title,
              moduleTitle: mod.title,
              title: nextLesson.title,
              route: `/app/training/${course.slug}/${nextLesson.id}`,
            };
            break;
          }
          if (lessons.length > 0 && !mastered.has(mod.id) && !masteryFallback) {
            masteryFallback = {
              kind: 'mastery',
              courseSlug: course.slug,
              courseTitle: course.title,
              moduleTitle: mod.title,
              title: mod.title,
              route: `/app/training/${course.slug}`,
            };
          }
        }
        if (found) break;
      }

      setNext(masteryFallback ?? found);
    } catch {
      setNext(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, track, activeVertical]);

  useEffect(() => {
    void load();
  }, [load]);

  return { next, isLoading };
}
