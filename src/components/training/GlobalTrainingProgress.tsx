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

        const { data: courses } = await supabase
          .from('training_courses')
          .select('id, slug')
          .eq('is_active', true)
          .in('slug', targetSlugs);

        if (!courses) { setIsLoading(false); return; }

        let totalItems = 0;
        let completedItems = 0;
        let bonusTotal = 0;
        let bonusCompleted = 0;

        for (const course of courses) {
          const isVideo = ['training-videos', 'manager-videos'].includes(course.slug);

          if (isVideo) {
            // Required videos only
            const { count: requiredCount } = await supabase
              .from('training_videos')
              .select('*', { count: 'exact', head: true })
              .eq('is_active', true)
              .eq('is_required', true);

            // Bonus videos
            const { count: bonusCount } = await supabase
              .from('training_videos')
              .select('*', { count: 'exact', head: true })
              .eq('is_active', true)
              .eq('is_required', false);

            // Get all watched video IDs
            const { data: watchedData } = await supabase
              .from('video_progress')
              .select('video_id')
              .eq('user_id', user.id)
              .eq('watched', true);

            const watchedIds = new Set((watchedData || []).map(w => w.video_id));

            // Get required video IDs to check which watched ones are required
            const { data: requiredVideos } = await supabase
              .from('training_videos')
              .select('id')
              .eq('is_active', true)
              .eq('is_required', true);

            const { data: bonusVideos } = await supabase
              .from('training_videos')
              .select('id')
              .eq('is_active', true)
              .eq('is_required', false);

            const requiredWatched = (requiredVideos || []).filter(v => watchedIds.has(v.id)).length;
            const bonusWatched = (bonusVideos || []).filter(v => watchedIds.has(v.id)).length;

            totalItems += requiredCount || 0;
            completedItems += requiredWatched;
            bonusTotal += bonusCount || 0;
            bonusCompleted += bonusWatched;
          } else {
            const { data: modules } = await supabase
              .from('training_modules')
              .select('id')
              .eq('course_id', course.id)
              .eq('is_active', true);

            const moduleIds = modules?.map(m => m.id) || [];
            if (moduleIds.length === 0) continue;

            const { data: lessons } = await supabase
              .from('training_lessons')
              .select('id')
              .in('module_id', moduleIds)
              .eq('is_active', true);

            const lessonIds = lessons?.map(l => l.id) || [];
            totalItems += lessonIds.length;

            if (lessonIds.length > 0) {
              const { count: completedCount } = await supabase
                .from('lesson_progress')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('quiz_passed', true)
                .in('lesson_id', lessonIds);

              completedItems += completedCount || 0;
            }
          }
        }

        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        setData({ totalItems, completedItems, percentage, bonusTotal, bonusCompleted });
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
              <Star className="w-3 h-3 text-yellow-400" />
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
