import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, Loader2, Video, Play, Bookmark } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getVideoThumbnailUrl } from '@/lib/videoUtils';
import { useVideoBookmarks } from '@/hooks/useVideoBookmarks';
import { VideoNotesPanel } from '@/components/training/VideoNotesPanel';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const { bookmarkedIds, toggleBookmark } = useVideoBookmarks();
  const [video, setVideo] = useState<TrainingVideo | null>(null);
  const [allVideos, setAllVideos] = useState<TrainingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatched, setIsWatched] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [savedPosition, setSavedPosition] = useState(0);
  const silentCompletedRef = useRef(false);
  const lastSavedPositionRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPositionRef = useRef({ time: 0, duration: 0 });

  // Save position to DB (debounced — called every 10 seconds)
  const savePositionToDb = useCallback(async () => {
    if (!user || !videoId) return;
    const { time, duration } = pendingPositionRef.current;
    if (time < 5 || Math.abs(time - lastSavedPositionRef.current) < 5) return;
    lastSavedPositionRef.current = time;
    try {
      await supabase
        .from('video_progress')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          last_position: time,
          duration: duration,
          watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,video_id' });
    } catch {}
  }, [user, videoId]);

  // Set up periodic save
  useEffect(() => {
    saveTimerRef.current = setInterval(savePositionToDb, 10000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      // Save on unmount
      savePositionToDb();
    };
  }, [savePositionToDb]);

  // Track time updates from VideoPlayer
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    pendingPositionRef.current = { time: currentTime, duration };
  }, []);

  useEffect(() => {
    if (!videoId || !user) return;
    silentCompletedRef.current = false;
    lastSavedPositionRef.current = 0;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [videoRes, allRes, progressRes, watchedRes] = await Promise.all([
          supabase.from('training_videos').select('*').eq('id', videoId).maybeSingle(),
          supabase.from('training_videos').select('*').eq('is_active', true).order('display_order'),
          supabase.from('video_progress').select('watched, last_position').eq('user_id', user.id).eq('video_id', videoId).maybeSingle(),
          supabase.from('video_progress').select('video_id').eq('user_id', user.id).eq('watched', true),
        ]);

        setVideo(videoRes.data);
        setAllVideos(allRes.data || []);
        const alreadyWatched = progressRes.data?.watched ?? false;
        setIsWatched(alreadyWatched);
        if (alreadyWatched) silentCompletedRef.current = true;
        setWatchedIds(new Set((watchedRes.data || []).map(p => p.video_id)));
        
        // Restore saved position
        const pos = (progressRes.data as any)?.last_position || 0;
        setSavedPosition(pos);
      } catch (err) {
        console.error('Error fetching video:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [videoId, user]);

  // Build strictly ordered "Up Next" queue
  const upNextVideos = useMemo(() => {
    if (!video || allVideos.length === 0) return [];

    const currentCatIdx = getCategoryIndex(video.category);

    const sorted = [...allVideos]
      .filter(v => v.id !== video.id)
      .sort((a, b) => {
        const catDiff = getCategoryIndex(a.category) - getCategoryIndex(b.category);
        if (catDiff !== 0) return catDiff;
        const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.title.localeCompare(b.title);
      });

    const sameCatAll = sorted.filter(v =>
      v.category.toLowerCase() === video.category.toLowerCase()
    );
    const sameCatUnwatched = sameCatAll.filter(v => !watchedIds.has(v.id));
    const sameCatWatched = sameCatAll.filter(v => watchedIds.has(v.id));

    const nextCatUnwatched = sorted.filter(v =>
      getCategoryIndex(v.category) > currentCatIdx &&
      !watchedIds.has(v.id)
    );

    const queue = [...sameCatUnwatched, ...sameCatWatched, ...nextCatUnwatched];
    return queue.slice(0, 6);
  }, [video, allVideos, watchedIds]);

  // Silent DB write — log every watch (rewatches count!) + mark first watch in video_progress
  const silentMarkComplete = useCallback(async () => {
    if (!user || !videoId || silentCompletedRef.current) return;
    silentCompletedRef.current = true;
    try {
      // 1. Always log the watch (allows rewatches to earn points)
      const watchDuration = video?.duration_minutes || 0;
      await (supabase as any).from('video_watch_log').insert({
        user_id: user.id,
        video_id: videoId,
        watched_at: new Date().toISOString(),
        watch_duration_minutes: watchDuration,
      });

      // 2. Also upsert video_progress for "first watch" tracking (progress calculations)
      await supabase
        .from('video_progress')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          watched: true,
          watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,video_id' });

      // 3. Award 40 points per watch
      try {
        await supabase.rpc('award_training_points', {
          _user_id: user.id,
          _points: 40,
        });
      } catch (e) {
        console.error('Points award failed:', e);
      }

      // 4. Log watch duration toward daily training time
      if (watchDuration > 0) {
        for (let i = 0; i < watchDuration; i++) {
          try { await supabase.rpc('record_daily_time', { _user_id: user.id, _category: 'video' }); } catch {}
        }
      }

      toast.success('Video complete! +40 points added to leaderboard');
    } catch (err) {
      console.error('Error marking watched:', err);
      silentCompletedRef.current = false;
    }
  }, [user, videoId, video]);

  // Manual button — updates UI
  const markAsWatched = useCallback(async () => {
    if (!user || !videoId || isWatched || isMarking) return;
    setIsMarking(true);
    if (!silentCompletedRef.current) {
      await silentMarkComplete();
    }
    setIsWatched(true);
    setWatchedIds(prev => new Set(prev).add(videoId));
    setIsMarking(false);
  }, [user, videoId, isWatched, isMarking, silentMarkComplete]);

  // Natural video end — always log (rewatches count!) + update UI
  const handleVideoEnded = useCallback(() => {
    // Reset the ref so rewatches get logged too
    silentCompletedRef.current = false;
    silentMarkComplete();
    setIsWatched(true);
    if (videoId) setWatchedIds(prev => new Set(prev).add(videoId));
  }, [silentMarkComplete, videoId]);

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
        {/* Back Button */}
        <PageBackButton to="/app/training/videos" label="Videos" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl overflow-hidden border border-border">
              <VideoPlayer
                src={video.video_url || ''}
                title={video.title}
                onEnded={handleVideoEnded}
                onTimeUpdate={handleTimeUpdate}
                startAt={savedPosition}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl font-bold text-foreground">{video.title}</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBookmark(video.id)}
                    className={cn(
                      "gap-1.5",
                      bookmarkedIds.has(video.id)
                        ? "text-yellow-500 hover:text-yellow-600"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Bookmark
                      className="w-4 h-4"
                      fill={bookmarkedIds.has(video.id) ? 'currentColor' : 'none'}
                    />
                    {bookmarkedIds.has(video.id) ? 'Bookmarked' : 'Bookmark'}
                  </Button>
                  {isWatched && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-success/15 text-success rounded-full text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Watched
                    </div>
                  )}
                </div>
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

            {/* Notes Panel - Mobile: below video */}
            {isMobile && videoId && (
              <div className="border border-border rounded-xl p-4 bg-card">
                <VideoNotesPanel videoId={videoId} />
              </div>
            )}
          </div>

          {/* Right Column: Notes + Up Next */}
          <div className="space-y-6">
            {/* Notes Panel - Desktop: side panel */}
            {!isMobile && videoId && (
              <div className="border border-border rounded-xl p-4 bg-card">
                <VideoNotesPanel videoId={videoId} />
              </div>
            )}

            {/* Up Next Sidebar */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Up Next</h3>
              {upNextVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">You've completed all videos!</p>
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
      </div>
    </AppLayout>
  );
}