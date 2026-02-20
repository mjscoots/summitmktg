import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical function to get the set of reachable rookie lesson IDs.
 * Used by ALL training progress views to ensure consistent numbers.
 *
 * Rules:
 * - Only active courses (is_active = true)
 * - Only courses targeted at rookies (target_role is null or 'rookie')
 * - Only active modules (is_active = true)
 * - Only active lessons (is_active = true, enforced by RLS)
 */
export async function getReachableRookieLessonIds(): Promise<Set<string>> {
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

  const ids = new Set<string>();
  (courses || []).forEach(course => {
    // Only rookie-accessible courses
    if (course.target_role !== null && course.target_role !== 'rookie') return;
    course.training_modules?.forEach(mod => {
      // Only active modules
      if (!(mod as any).is_active) return;
      mod.training_lessons?.forEach(lesson => {
        ids.add(lesson.id);
      });
    });
  });
  return ids;
}

/**
 * Count completed lessons for given user IDs, only counting reachable lessons.
 */
export async function getCompletedLessonCounts(
  userIds: string[],
  reachableLessonIds: Set<string>
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select('user_id, lesson_id')
    .in('user_id', userIds)
    .not('completed_at', 'is', null);

  const counts = new Map<string, number>();
  const seen = new Map<string, Set<string>>();

  (lessonProgress || []).forEach(lp => {
    if (!reachableLessonIds.has(lp.lesson_id)) return;
    if (!seen.has(lp.user_id)) seen.set(lp.user_id, new Set());
    seen.get(lp.user_id)!.add(lp.lesson_id);
  });

  seen.forEach((lessons, userId) => {
    counts.set(userId, lessons.size);
  });

  return counts;
}
