import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, Loader2, Video, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

export default function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState<TrainingVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatched, setIsWatched] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<TrainingVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!videoId || !user) return;
    const fetchVideo = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('training_videos')
          .select('*')
          .eq('id', videoId)
          .maybeSingle();
        setVideo(data);

        if (data) {
          // Fetch related videos (same category)
          const { data: related } = await supabase
            .from('training_videos')
            .select('*')
            .eq('category', data.category)
            .eq('is_active', true)
            .neq('id', data.id)
            .order('display_order')
            .limit(6);
          setRelatedVideos(related || []);
        }

        // Check if watched
        const { data: progress } = await supabase
          .from('video_progress')
          .select('watched')
          .eq('user_id', user.id)
          .eq('video_id', videoId)
          .maybeSingle();
        setIsWatched(progress?.watched ?? false);

        // Get all watched IDs for related videos
        const { data: allProgress } = await supabase
          .from('video_progress')
          .select('video_id')
          .eq('user_id', user.id)
          .eq('watched', true);
        setWatchedIds(new Set((allProgress || []).map(p => p.video_id)));
      } catch (err) {
        console.error('Error fetching video:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideo();
  }, [videoId, user]);

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

      // Award leaderboard points
      try {
        await supabase.rpc('award_training_points', {
          _user_id: user.id,
          _points: 10,
        });
      } catch (e) {
        // Non-critical
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
        {/* Back button */}
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
            {/* Player */}
            <div className="rounded-xl overflow-hidden border border-border">
              <VideoPlayer
                src={video.video_url || ''}
                title={video.title}
                onEnded={markAsWatched}
              />
            </div>

            {/* Video Info */}
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

              {/* Mark as Watched Button */}
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

          {/* Related Videos Sidebar */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Up Next</h3>
            {relatedVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related videos</p>
            ) : (
              <div className="space-y-3">
                {relatedVideos.map(rv => {
                  const rvWatched = watchedIds.has(rv.id);
                  return (
                    <div
                      key={rv.id}
                      onClick={() => navigate(`/app/training/videos/${rv.id}`)}
                      className="flex gap-3 cursor-pointer group"
                    >
                      <div className="w-32 flex-shrink-0 aspect-video bg-muted rounded-lg relative flex items-center justify-center overflow-hidden">
                        {rv.thumbnail_url ? (
                          <img src={rv.thumbnail_url} alt={rv.title} className="w-full h-full object-cover" />
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
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {rv.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground">{rv.category}</span>
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
