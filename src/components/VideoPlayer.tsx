import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getCleanVimeoEmbedUrl } from '@/lib/videoUtils';
import Player from '@vimeo/player';

// Extract Vimeo video ID
function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

// --- VimeoEmbed defined OUTSIDE VideoPlayer to prevent unmount/remount ---
function VimeoEmbed({ vimeoSrc, vimeoTitle, vimeoClassName, vimeoOnEnded, vimeoStartAt, vimeoOnProgress }: {
  vimeoSrc: string; vimeoTitle?: string; vimeoClassName?: string;
  vimeoOnEnded?: () => void; vimeoStartAt?: number;
  vimeoOnProgress?: (currentTime: number, duration: number) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasTriggeredComplete = useRef(false);
  const onEndedRef = useRef(vimeoOnEnded);
  const onProgressRef = useRef(vimeoOnProgress);
  const hasSetStartTime = useRef(false);
  const vimeoId = getVimeoId(vimeoSrc);

  onEndedRef.current = vimeoOnEnded;
  onProgressRef.current = vimeoOnProgress;

  useEffect(() => {
    hasTriggeredComplete.current = false;
    hasSetStartTime.current = false;
  }, [vimeoSrc]);

  useEffect(() => {
    if (!iframeRef.current) return;

    const player = new Player(iframeRef.current);

    player.on('ended', () => {
      if (!hasTriggeredComplete.current) {
        hasTriggeredComplete.current = true;
        onEndedRef.current?.();
      }
    });

    // Save position every 5 seconds
    player.on('timeupdate', (data: { seconds: number; duration: number }) => {
      onProgressRef.current?.(data.seconds, data.duration);
    });

    // Resume from saved position
    if (vimeoStartAt && vimeoStartAt > 5 && !hasSetStartTime.current) {
      hasSetStartTime.current = true;
      player.ready().then(() => {
        player.setCurrentTime(vimeoStartAt).catch(() => {});
      });
    }

    return () => {
      player.off('ended');
      player.off('timeupdate');
      player.destroy();
    };
  }, [vimeoSrc, vimeoStartAt]);

  return (
    <div className={cn("aspect-video w-full rounded-xl overflow-hidden bg-black", vimeoClassName)}>
      <iframe
        ref={iframeRef}
        src={getCleanVimeoEmbedUrl(vimeoId || '')}
        title={vimeoTitle || 'Video'}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
        style={{ border: 'none' }}
      />
    </div>
  );
}

interface VideoPlayerProps {
  src: string;
  title?: string;
  onEnded?: () => void;
  onProgress?: (percent: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  startAt?: number;
  className?: string;
}

export function VideoPlayer({ src, title, onEnded, onProgress, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentTimeRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if it's an external URL (YouTube/Vimeo)
  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
  const isVimeo = src.includes('vimeo.com');
  const isExternal = isYouTube || isVimeo;
  
  // Check if it's already a full URL (http/https) or a storage path
  const isFullUrl = src.startsWith('http://') || src.startsWith('https://');
  const isStoragePath = !isFullUrl && !isExternal;

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  // Preserve playback position for native HTML5 video across visibility changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isExternal) return;

    const handleTimeUpdate = () => {
      currentTimeRef.current = video.currentTime;
      wasPlayingRef.current = !video.paused;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        // Save state when tab hides
        currentTimeRef.current = video.currentTime;
        wasPlayingRef.current = !video.paused;
      } else {
        // Restore position if it drifted (e.g. element was recreated)
        if (video.readyState >= 1 && Math.abs(video.currentTime - currentTimeRef.current) > 2) {
          video.currentTime = currentTimeRef.current;
          if (wasPlayingRef.current) {
            video.play().catch(() => {});
          }
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isExternal, signedUrl]);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (isStoragePath && !isExternal) {
        setIsLoading(true);
        setError(null);
        try {
          const { data, error: urlError } = await supabase.storage
            .from('training-videos')
            .createSignedUrl(src, 3600); // 1 hour expiry

          if (urlError) throw urlError;
          setSignedUrl(data.signedUrl);
        } catch (err: any) {
          console.error('Failed to get signed URL:', err);
          setError('Failed to load video');
        } finally {
          setIsLoading(false);
        }
      } else if (isFullUrl && !isExternal) {
        // Already a full URL (legacy data), use as-is
        setSignedUrl(src);
      }
    };

    fetchSignedUrl();
  }, [src, isStoragePath, isExternal, isFullUrl]);

  if (isYouTube) {
    const videoId = getYouTubeId(src);
    return (
      <div className={cn("aspect-video w-full rounded-lg overflow-hidden bg-black", className)}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title={title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  if (isVimeo) {
    return (
      <VimeoEmbed
        vimeoSrc={src}
        vimeoTitle={title}
        vimeoClassName={className}
        vimeoOnEnded={onEnded}
      />
    );
  }

  // Native HTML5 video player for uploaded videos
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      onProgress?.(currentProgress);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center", className)}>
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center", className)}>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  // Waiting for signed URL
  if (!signedUrl && isStoragePath) {
    return (
      <div className={cn("aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center", className)}>
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const videoSrc = signedUrl || src;

  return (
    <div 
      className={cn("relative aspect-video w-full rounded-lg overflow-hidden bg-black group", className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      {/* Controls overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        {/* Center play button */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-transform hover:scale-110"
          >
            <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
          </button>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Progress bar */}
          <div 
            className="h-1 bg-white/30 rounded-full cursor-pointer group/progress"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-primary rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-primary transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={handleRestart}
                className="text-white hover:text-primary transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={toggleMute}
                className="text-white hover:text-primary transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <span className="text-white text-sm">
                {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
              </span>
            </div>

            <button
              onClick={handleFullscreen}
              className="text-white hover:text-primary transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
