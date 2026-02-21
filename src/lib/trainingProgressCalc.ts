import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical function to get the full set of required rookie training item IDs.
 * Includes: active lessons from rookie courses + required training videos.
 * Used by ALL training progress views to ensure consistent numbers.
 */
export interface RookieTrainingItems {
  lessonIds: Set<string>;
  videoIds: Set<string>;
  totalCount: number;
}

export async function getReachableRookieTrainingItems(): Promise<RookieTrainingItems> {
  // 1. Get lesson IDs from active rookie courses/modules
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

  // 2. Get required training video IDs
  const { data: videos } = await supabase
    .from('training_videos')
    .select('id')
    .eq('is_active', true)
    .eq('is_required', true);

  const videoIds = new Set<string>();
  (videos || []).forEach(v => videoIds.add(v.id));

  return {
    lessonIds,
    videoIds,
    totalCount: lessonIds.size + videoIds.size,
  };
}

/**
 * Backwards-compatible alias – returns lesson IDs only.
 * Prefer getReachableRookieTrainingItems() for full counts.
 */
export async function getReachableRookieLessonIds(): Promise<Set<string>> {
  const items = await getReachableRookieTrainingItems();
  return items.lessonIds;
}

/**
 * Count completed items (lessons + videos) for given user IDs.
 */
export async function getCompletedTrainingCounts(
  userIds: string[],
  items: RookieTrainingItems
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  // Fetch lesson completions
  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select('user_id, lesson_id')
    .in('user_id', userIds)
    .not('completed_at', 'is', null);

  // Fetch video completions
  const { data: videoProgress } = await supabase
    .from('video_progress')
    .select('user_id, video_id')
    .in('user_id', userIds)
    .eq('watched', true);

  const seen = new Map<string, Set<string>>();

  (lessonProgress || []).forEach(lp => {
    if (!items.lessonIds.has(lp.lesson_id)) return;
    if (!seen.has(lp.user_id)) seen.set(lp.user_id, new Set());
    seen.get(lp.user_id)!.add('l_' + lp.lesson_id);
  });

  (videoProgress || []).forEach(vp => {
    if (!items.videoIds.has(vp.video_id)) return;
    if (!seen.has(vp.user_id)) seen.set(vp.user_id, new Set());
    seen.get(vp.user_id)!.add('v_' + vp.video_id);
  });

  const counts = new Map<string, number>();
  seen.forEach((itemSet, userId) => {
    counts.set(userId, itemSet.size);
  });

  return counts;
}

/**
 * Legacy alias for lesson-only counting.
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

  const seen = new Map<string, Set<string>>();

  (lessonProgress || []).forEach(lp => {
    if (!reachableLessonIds.has(lp.lesson_id)) return;
    if (!seen.has(lp.user_id)) seen.set(lp.user_id, new Set());
    seen.get(lp.user_id)!.add(lp.lesson_id);
  });

  const counts = new Map<string, number>();
  seen.forEach((lessons, userId) => {
    counts.set(userId, lessons.size);
  });

  return counts;
}
