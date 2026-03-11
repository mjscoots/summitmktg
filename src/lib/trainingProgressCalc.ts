import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical function to get the full set of required rookie training item IDs.
 * Only includes: active lessons from rookie courses.
 * Videos are tracked independently and do NOT count toward training progress.
 */
export interface RookieTrainingItems {
  lessonIds: Set<string>;
  videoIds: Set<string>;
  totalCount: number;
}

export async function getReachableRookieTrainingItems(): Promise<RookieTrainingItems> {
  // Get lesson IDs from active rookie courses/modules
  const { data: courses } = await supabase
    .from('training_courses')
    .select(`
      id,
      target_role,
      training_modules (
        id,
        is_active,
        training_lessons (
          id
        )
      )
    `)
    .eq('is_active', true);

  interface ModuleResult {
    id: string;
    is_active: boolean;
    training_lessons: { id: string }[] | null;
  }

  const lessonIds = new Set<string>();
  (courses || []).forEach(course => {
    if (course.target_role !== null && course.target_role !== 'rookie') return;
    (course.training_modules as ModuleResult[] | null)?.forEach(mod => {
      if (!mod.is_active) return;
      mod.training_lessons?.forEach(lesson => {
        lessonIds.add(lesson.id);
      });
    });
  });

  // Videos no longer count toward progress
  const videoIds = new Set<string>();

  return {
    lessonIds,
    videoIds,
    totalCount: lessonIds.size,
  };
}

/**
 * Count completed items (lessons only) for given user IDs.
 */
export async function getCompletedTrainingCounts(
  userIds: string[],
  items: RookieTrainingItems
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  // Fetch lesson completions only
  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select('user_id, lesson_id')
    .in('user_id', userIds)
    .not('completed_at', 'is', null);

  const seen = new Map<string, Set<string>>();

  (lessonProgress || []).forEach(lp => {
    if (!items.lessonIds.has(lp.lesson_id)) return;
    if (!seen.has(lp.user_id)) seen.set(lp.user_id, new Set());
    seen.get(lp.user_id)!.add('l_' + lp.lesson_id);
  });

  const counts = new Map<string, number>();
  seen.forEach((itemSet, userId) => {
    counts.set(userId, itemSet.size);
  });

  return counts;
}
