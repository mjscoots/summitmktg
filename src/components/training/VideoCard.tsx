import { useState } from 'react';
import { Play, CheckCircle, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVideoThumbnailUrl } from '@/lib/videoUtils';
import { isBonusCategory } from '@/lib/trainingConstants';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

interface VideoCardProps {
  video: TrainingVideo;
  isWatched: boolean;
  onClick: () => void;
  highlightTitle?: React.ReactNode;
}

export function VideoCard({ video, isWatched, onClick, highlightTitle }: VideoCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isBonus = isBonusCategory(video.category);

  const thumbnailUrl = video.thumbnail_url || getVideoThumbnailUrl(video.video_url);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-xl overflow-hidden bg-card border border-border",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.03] hover:shadow-xl hover:shadow-black/10 hover:border-primary/30"
      )}
    >
      {/* Thumbnail Container - 16:9 */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {thumbnailUrl && !imgError ? (
          <>
            {/* Skeleton while loading */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={thumbnailUrl}
              alt={video.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={cn(
                "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105",
                imgLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          </>
        ) : (
          /* Fallback: gradient with play icon */
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-muted to-primary/10 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Play className="w-7 h-7 text-primary ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200">
          <div className={cn(
            "w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100",
            "transition-all duration-200"
          )}>
            <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge - bottom right */}
        {video.duration_minutes && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-black/80 text-white text-[11px] font-medium rounded">
            <Clock className="w-3 h-3" />
            {video.duration_minutes} min
          </div>
        )}

        {/* Watched badge - top right */}
        {isWatched && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-0.5 bg-success text-success-foreground rounded-full text-[10px] font-bold tracking-wide">
            <CheckCircle className="w-3 h-3" />
            WATCHED
          </div>
        )}

        {/* Bonus badge - top left */}
        {isBonus && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 bg-yellow-500/90 text-white rounded-full text-[10px] font-bold tracking-wide">
            <Star className="w-3 h-3" />
            BONUS
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {highlightTitle || video.title}
          </h3>
          {isBonus && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-500 border border-yellow-500/30">
              Optional
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
            {video.category}
          </span>
          {video.target_role && (
            <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground capitalize">
              {video.target_role}
            </span>
          )}
        </div>
        {video.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{video.description}</p>
        )}
      </div>
    </div>
  );
}
