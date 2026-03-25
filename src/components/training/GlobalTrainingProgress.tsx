import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Trophy, Star } from 'lucide-react';
import { MilestoneBadges } from './MilestoneBadges';
import { CompletionCelebration } from './CompletionCelebration';

interface GlobalProgressData {
  totalItems: number;
  completedItems: number;
  percentage: number;
  bonusTotal: number;
  bonusCompleted: number;
}

export function GlobalTrainingProgress({ filterRole }: { filterRole?: 'rookie' | 'manager' }) {
  const { user } = useAuth();
  const [data, setData] = useState<GlobalProgressData>({ totalItems: 0, completedItems: 0, percentage: 0, bonusTotal: 0, bonusCompleted: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalProgress = async () => {
      if (!user?.id) return;

      try {
        const rookieSlugs = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];
        const managerSlugs = ['manager-manual', 'learn-the-basics', 'recruiting-resources', 'manager-videos'];
        const targetSlugs = filterRole === 'manager' ? managerSlugs : rookieSlugs;

        // Batch: fetch courses, all videos, and user progress in parallel
        const [coursesRes, requiredVideosRes, bonusVideosRes, watchedRes] = await Promise.all([
          supabase
            .from('training_courses')
            .select(`
              id, slug,
              training_modules!inner (
                id,
                is_active,
                training_lessons (id)
              )
            `)
            .eq('is_active', true)
            .in('slug', targetSlugs),
          supabase
            .from('training_videos')
            .select('id')
            .eq('is_active', true)
            .eq('is_required', true),
          supabase
            .from('training_videos')
            .select('id')
            .eq('is_active', true)
            .eq('is_required', false),
          supabase
            .from('video_progress')
            .select('video_id')
            .eq('user_id', user.id)
            .eq('watched', true),
        ]);

        const courses = coursesRes.data || [];
        const requiredVideos = requiredVideosRes.data || [];
        const bonusVideos = bonusVideosRes.data || [];
        const watchedIds = new Set((watchedRes.data || []).map(w => w.video_id));

        // Collect all lesson IDs from non-video courses
        const allLessonIds: string[] = [];
        const videoSlugs = ['training-videos', 'manager-videos'];

        for (const course of courses) {
          if (videoSlugs.includes(course.slug)) continue;
          for (const mod of course.training_modules || []) {
            if (!(mod as { is_active: boolean }).is_active) continue;
            for (const lesson of (mod as { training_lessons: { id: string }[] }).training_lessons || []) {
              allLessonIds.push(lesson.id);
            }
          }
        }

        // Batch: fetch lesson completion counts
        let completedLessons = 0;
        if (allLessonIds.length > 0) {
          const { count } = await supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .in('lesson_id', allLessonIds);
          completedLessons = count || 0;
        }

        // Count video completions
        const hasVideoSlug = courses.some(c => videoSlugs.includes(c.slug));
        const requiredWatched = hasVideoSlug ? requiredVideos.filter(v => watchedIds.has(v.id)).length : 0;
        const bonusWatched = hasVideoSlug ? bonusVideos.filter(v => watchedIds.has(v.id)).length : 0;

        const totalItems = allLessonIds.length + (hasVideoSlug ? requiredVideos.length : 0);
        const completedItems = completedLessons + requiredWatched;
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        setData({
          totalItems,
          completedItems,
          percentage,
          bonusTotal: hasVideoSlug ? bonusVideos.length : 0,
          bonusCompleted: bonusWatched,
        });
      } catch (err) {
        console.error('Error fetching global progress:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalProgress();
  }, [user?.id, filterRole]);

  if (isLoading) {
    return (
      <div className="mb-6 p-5 bg-card rounded-xl border border-border animate-pulse h-24" />
    );
  }

  const isComplete = data.percentage === 100;

  return (
    <>
      <div className={cn(
        "mb-4 p-5 bg-card rounded-xl border transition-all",
        isComplete
          ? "border-success/50 shadow-[0_0_30px_-10px_rgba(34,197,94,0.3)]"
          : "border-border"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Trophy className={cn(
              "w-5 h-5",
              isComplete ? "text-success" : "text-primary"
            )} />
            <span className="text-sm font-bold uppercase tracking-wider text-foreground">
              Total Training Progress
            </span>
          </div>
          <span className={cn(
            "text-lg font-bold tabular-nums",
            isComplete ? "text-success" : "text-primary"
          )}>
            {data.percentage}%
          </span>
        </div>

        <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isComplete ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${data.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Completed {data.completedItems} of {data.totalItems} required lessons
          </span>
          {data.bonusTotal > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-primary" />
              {data.bonusCompleted} bonus watched
            </span>
          )}
        </div>
      </div>

      {/* Milestone Badges */}
      <MilestoneBadges percentage={data.percentage} />

      {/* Completion Celebration (triggers once at 100%) */}
      <CompletionCelebration percentage={data.percentage} />
    </>
  );
}
