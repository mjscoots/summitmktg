import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Users, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RepProgress {
  userId: string;
  name: string;
  globalPercent: number;
  pitchPercent: number;
  manualPercent: number;
  videoPercent: number;
  lastActive: string | null;
}

type SortMode = 'highest' | 'lowest' | 'recent';

export function ManagerTrainingOverview() {
  const { user, role } = useAuth();
  const [reps, setReps] = useState<RepProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('highest');

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    const fetchRepProgress = async () => {
      if (!user?.id || !isManager) return;

      try {
        // Get current user's profile for name-based downline
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!myProfile) { setIsLoading(false); return; }

        // Get downline reps
        const { data: downline } = await supabase
          .rpc('get_user_downline', { _manager_name: myProfile.full_name });

        if (!downline || downline.length === 0) { setIsLoading(false); return; }

        // Get rookie reps only
        const rookieReps = downline.filter(d => d.role === 'rookie');

        // Get course structure
        const slugsToCheck = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];
        const { data: courses } = await supabase
          .from('training_courses')
          .select('id, slug')
          .eq('is_active', true)
          .in('slug', slugsToCheck);

        if (!courses) { setIsLoading(false); return; }

        // Get lesson IDs per course
        const courseLessonMap: Record<string, string[]> = {};
        for (const course of courses) {
          if (course.slug === 'training-videos') continue;
          const { data: modules } = await supabase
            .from('training_modules')
            .select('id')
            .eq('course_id', course.id)
            .eq('is_active', true);
          const moduleIds = modules?.map(m => m.id) || [];
          if (moduleIds.length === 0) { courseLessonMap[course.slug] = []; continue; }
          const { data: lessons } = await supabase
            .from('training_lessons')
            .select('id')
            .in('module_id', moduleIds)
            .eq('is_active', true);
          courseLessonMap[course.slug] = lessons?.map(l => l.id) || [];
        }

        // Get total video count
        const { count: totalVideos } = await supabase
          .from('training_videos')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        const pitchLessons = courseLessonMap['learn-your-pitch'] || [];
        const manualLessons = courseLessonMap['summer-sales-manual'] || [];
        const totalVideoCount = totalVideos || 0;
        const totalAll = pitchLessons.length + manualLessons.length + totalVideoCount;

        // Build rep progress
        const repProgress: RepProgress[] = await Promise.all(
          rookieReps.map(async (rep) => {
            // Lesson progress
            const { data: lessonProg } = await supabase
              .from('lesson_progress')
              .select('lesson_id')
              .eq('user_id', rep.user_id)
              .eq('quiz_passed', true);

            const completedIds = new Set(lessonProg?.map(lp => lp.lesson_id) || []);

            const pitchDone = pitchLessons.filter(id => completedIds.has(id)).length;
            const manualDone = manualLessons.filter(id => completedIds.has(id)).length;

            // Video progress
            const { count: videosDone } = await supabase
              .from('video_progress')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', rep.user_id)
              .eq('watched', true);

            const totalDone = pitchDone + manualDone + (videosDone || 0);
            const globalPercent = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

            // Get last active
            const { data: profile } = await supabase
              .from('profiles')
              .select('last_active_at')
              .eq('user_id', rep.user_id)
              .maybeSingle();

            return {
              userId: rep.user_id,
              name: rep.full_name,
              globalPercent,
              pitchPercent: pitchLessons.length > 0 ? Math.round((pitchDone / pitchLessons.length) * 100) : 0,
              manualPercent: manualLessons.length > 0 ? Math.round((manualDone / manualLessons.length) * 100) : 0,
              videoPercent: totalVideoCount > 0 ? Math.round(((videosDone || 0) / totalVideoCount) * 100) : 0,
              lastActive: profile?.last_active_at || null,
            };
          })
        );

        setReps(repProgress);
      } catch (err) {
        console.error('Error fetching rep progress:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepProgress();
  }, [user?.id, isManager]);

  if (!isManager) return null;

  const sorted = [...reps].sort((a, b) => {
    if (sortMode === 'highest') return b.globalPercent - a.globalPercent;
    if (sortMode === 'lowest') return a.globalPercent - b.globalPercent;
    // recent
    const aTime = a.lastActive ? new Date(a.lastActive).getTime() : 0;
    const bTime = b.lastActive ? new Date(b.lastActive).getTime() : 0;
    return bTime - aTime;
  });

  const cycleSortMode = () => {
    const modes: SortMode[] = ['highest', 'lowest', 'recent'];
    const idx = modes.indexOf(sortMode);
    setSortMode(modes[(idx + 1) % modes.length]);
  };

  const sortLabel = sortMode === 'highest' ? 'Highest First' : sortMode === 'lowest' ? 'Lowest First' : 'Recently Active';

  if (isLoading) {
    return <div className="bg-card rounded-xl border border-border p-5 animate-pulse h-40" />;
  }

  if (reps.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Rep Training Progress</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={cycleSortMode} className="text-xs gap-1.5 text-muted-foreground">
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortLabel}
        </Button>
      </div>

      <div className="space-y-3">
        {sorted.map((rep) => (
          <div key={rep.userId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{rep.name}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <ProgressPill label="Pitch" value={rep.pitchPercent} />
                <ProgressPill label="Manual" value={rep.manualPercent} />
                <ProgressPill label="Videos" value={rep.videoPercent} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={cn(
                "text-lg font-bold tabular-nums",
                rep.globalPercent === 100 ? "text-success" : rep.globalPercent >= 50 ? "text-primary" : "text-muted-foreground"
              )}>
                {rep.globalPercent}%
              </span>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    rep.globalPercent === 100 ? "bg-success" : "bg-primary"
                  )}
                  style={{ width: `${rep.globalPercent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressPill({ label, value }: { label: string; value: number }) {
  return (
    <span className={cn(
      "text-[10px] font-medium px-1.5 py-0.5 rounded",
      value === 100
        ? "bg-success/15 text-success"
        : value > 0
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground"
    )}>
      {label} {value}%
    </span>
  );
}
