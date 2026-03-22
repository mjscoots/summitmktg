import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getVideoThumbnailUrl } from '@/lib/videoUtils';

interface LastWatched {
  video_id: string;
  last_position: number;
  duration: number;
  title: string;
  category: string;
  thumbnail_url: string | null;
  video_url: string;
  duration_minutes: number | null;
}

export function ContinueWatchingCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get most recently watched video that has a saved position and isn't fully watched
      const { data } = await supabase
        .from('video_progress')
        .select('video_id, last_position, duration, watched_at')
        .eq('user_id', user.id)
        .gt('last_position', 5) // at least 5 seconds in
        .eq('watched', false)
        .order('watched_at', { ascending: false })
        .limit(1);

      if (!data || data.length === 0) return;

      const vp = data[0] as any;
      
      // Get the video details
      const { data: video } = await supabase
        .from('training_videos')
        .select('title, category, thumbnail_url, video_url, duration_minutes')
        .eq('id', vp.video_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!video) return;

      setLastWatched({
        video_id: vp.video_id,
        last_position: vp.last_position || 0,
        duration: vp.duration || 0,
        title: video.title,
        category: video.category,
        thumbnail_url: video.thumbnail_url,
        video_url: video.video_url,
        duration_minutes: video.duration_minutes,
      });
    };
    fetch();
  }, [user]);

  if (!lastWatched) return null;

  const progressPercent = lastWatched.duration > 0
    ? Math.min((lastWatched.last_position / lastWatched.duration) * 100, 100)
    : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const thumbnail = lastWatched.thumbnail_url || getVideoThumbnailUrl(lastWatched.video_url);

  return (
    <button
      onClick={() => navigate(`/app/training/videos/${lastWatched.video_id}`)}
      className={cn(
        "w-full mb-4 bg-card rounded-xl border border-border overflow-hidden",
        "hover:border-primary/40 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)]",
        "transition-all duration-300 group text-left"
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-28 flex-shrink-0 aspect-video bg-muted rounded-lg relative overflow-hidden">
          {thumbnail ? (
            <img src={thumbnail} alt={lastWatched.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
          {/* Progress bar on thumbnail */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Continue Watching</p>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {lastWatched.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">{lastWatched.category}</span>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(lastWatched.last_position)} left off
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
