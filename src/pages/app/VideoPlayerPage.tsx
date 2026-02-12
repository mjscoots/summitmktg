import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, Loader2, Video, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getVideoThumbnailUrl } from '@/lib/videoUtils';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

// Fixed global category order for structured training progression
const CATEGORY_ORDER: string[] = [
  'Introduction',
  'Fresh Account',
  'Switchover',
  'Body Language',
  'Tonality',
  'Objections',
  'Closing',
  'Advanced Training',
  'Mental Mastery',
  'Zoom Trainings',
  'Manager Training',
];

function getCategoryIndex(category: string): number {
  const idx = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === category.toLowerCase());
  return idx >= 0 ? idx : 999;
}

export default function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState<TrainingVideo | null>(null);
  const [allVideos, setAllVideos] = useState<TrainingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatched, setIsWatched] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [hasAutoCompleted, setHasAutoCompleted] = useState(false);

  useEffect(() => {
    if (!videoId || !user) return;
    setHasAutoCompleted(false);
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [videoRes, allRes, progressRes, watchedRes] = await Promise.all([
          supabase.from('training_videos').select('*').eq('id', videoId).maybeSingle(),
          supabase.from('training_videos').select('*').eq('is_active', true).order('display_order'),
          supabase.from('video_progress').select('watched').eq('user_id', user.id).eq('video_id', videoId).maybeSingle(),
          supabase.from('video_progress').select('video_id').eq('user_id', user.id).eq('watched', true),
        ]);

        setVideo(videoRes.data);
        setAllVideos(allRes.data || []);
        setIsWatched(progressRes.data?.watched ?? false);
        setWatchedIds(new Set((watchedRes.data || []).map(p => p.video_id)));
      } catch (err) {
        console.error('Error fetching video:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [videoId, user]);

  // Build strictly ordered "Up Next" queue — unwatched first, same category first
  const upNextVideos = useMemo(() => {
    if (!video || allVideos.length === 0) return [];

    const currentCatIdx = getCategoryIndex(video.category);

    // Sort all videos by category order, then display_order
    const sorted = [...allVideos]
      .filter(v => v.id !== video.id)
      .sort((a, b) => {
        const catDiff = getCategoryIndex(a.category) - getCategoryIndex(b.category);
        if (catDiff !== 0) return catDiff;
        return (a.display_order ?? 0) - (b.display_order ?? 0);
      });

    // Step 1: Unwatched videos in same category after current position
    const sameCatUnwatched = sorted.filter(v =>
      v.category.toLowerCase() === video.category.toLowerCase() &&
      (v.display_order ?? 0) > (video.display_order ?? 0) &&
      !watchedIds.has(v.id)
    );

    // Step 2: If same category exhausted, get unwatched from next categories in order
    const nextCatUnwatched = sorted.filter(v =>
      getCategoryIndex(v.category) > currentCatIdx &&
      !watchedIds.has(v.id)
    );

    // Step 3: Fill remaining slots with watched same-cat videos (for context)
    const sameCatWatched = sorted.filter(v =>
      v.category.toLowerCase() === video.category.toLowerCase() &&
      (v.display_order ?? 0) > (video.display_order ?? 0) &&
      watchedIds.has(v.id)
    );

    const queue = [...sameCatUnwatched, ...sameCatWatched, ...nextCatUnwatched];
    return queue.slice(0, 6);
  }, [video, allVideos, watchedIds]);

  const markAsWatched = useCallback(async () => {
    if (!user || !videoId || isWatched || isMarking) return;
    setIsMarking(true);
    try {
      const { error } = await supabase
        .from('video_progress')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          watched: true,
          watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,video_id' });

      if (error) throw error;

      setIsWatched(true);
      setWatchedIds(prev => new Set(prev).add(videoId));

      try {
        await supabase.rpc('award_training_points', {
          _user_id: user.id,
          _points: 10,
        });
      } catch (e) {
        console.error('Points award failed:', e);
      }

      toast.success('Video complete! +10 points added to leaderboard');
    } catch (err) {
      console.error('Error marking watched:', err);
      toast.error('Failed to mark as watched');
    } finally {
      setIsMarking(false);
    }
  }, [user, videoId, isWatched, isMarking]);

  // Auto-complete at 90% progress (for native HTML5 videos)
  const handleProgress = useCallback((percent: number) => {
    if (percent >= 90 && !isWatched && !hasAutoCompleted) {
      setHasAutoCompleted(true);
      markAsWatched();
    }
  }, [isWatched, hasAutoCompleted, markAsWatched]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!video) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">
          <p>Video not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/app/training/videos')}>
            Back to Videos
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/training/videos')}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Videos
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl overflow-hidden border border-border">
              <VideoPlayer
                src={video.video_url || ''}
                title={video.title}
                onEnded={markAsWatched}
                onProgress={handleProgress}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl font-bold text-foreground">{video.title}</h1>
                {isWatched && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-success/15 text-success rounded-full text-xs font-bold flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Watched
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {video.category}
                </span>
                {video.target_role && (
                  <span className="px-2.5 py-1 bg-muted rounded-full text-xs text-muted-foreground capitalize">
                    {video.target_role} only
                  </span>
                )}
                {video.duration_minutes && (
                  <span className="text-xs text-muted-foreground">
                    {video.duration_minutes} min
                  </span>
                )}
              </div>

              {video.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{video.description}</p>
              )}

              {!isWatched && (
                <Button
                  onClick={markAsWatched}
                  disabled={isMarking}
                  className="gap-2 bg-success hover:bg-success/90 text-white"
                >
                  {isMarking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark as Watched
                </Button>
              )}
            </div>
          </div>

          {/* Up Next Sidebar - Unwatched first, sequential */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Up Next</h3>
            {upNextVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground">You've completed all videos! 🎉</p>
            ) : (
              <div className="space-y-3">
                {upNextVideos.map((rv, idx) => {
                  const rvWatched = watchedIds.has(rv.id);
                  const isCategoryChange = idx === 0
                    ? rv.category.toLowerCase() !== video.category.toLowerCase()
                    : rv.category.toLowerCase() !== upNextVideos[idx - 1].category.toLowerCase();
                  const thumbnail = rv.thumbnail_url || getVideoThumbnailUrl(rv.video_url);

                  return (
                    <div key={rv.id}>
                      {isCategoryChange && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5 mt-2">
                          Next: {rv.category}
                        </div>
                      )}
                      <div
                        onClick={() => navigate(`/app/training/videos/${rv.id}`)}
                        className={cn(
                          "flex gap-3 cursor-pointer group",
                          rvWatched && "opacity-60"
                        )}
                      >
                        <div className="w-32 flex-shrink-0 aspect-video bg-muted rounded-lg relative flex items-center justify-center overflow-hidden">
                          {thumbnail ? (
                            <img src={thumbnail} alt={rv.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <Video className="w-6 h-6 text-muted-foreground/50" />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-5 h-5 text-white" fill="currentColor" />
                          </div>
                          {rvWatched && (
                            <div className="absolute top-1 right-1">
                              <CheckCircle className="w-4 h-4 text-success" />
                            </div>
                          )}
                          {rv.duration_minutes && (
                            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                              {rv.duration_minutes}m
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {rv.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground">{rv.category}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}