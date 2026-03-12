import { useState } from 'react';
import { Play, CheckCircle, Clock, Star, FileText, Bookmark } from 'lucide-react';
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
  hasNotes?: boolean;
  isBookmarked?: boolean;
  bookmarkedAt?: string;
}

export function VideoCard({ video, isWatched, onClick, highlightTitle, hasNotes, isBookmarked, bookmarkedAt }: VideoCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isBonus = isBonusCategory(video.category);

  const thumbnailUrl = video.thumbnail_url || getVideoThumbnailUrl(video.video_url);

  // Check if new (created within last 7 days)
  const isNew = video.created_at && (Date.now() - new Date(video.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-xl overflow-hidden bg-card border border-border flex flex-col",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-black/10 hover:border-primary/30"
      )}
    >
      {/* Thumbnail — fixed 16:9 */}
      <div className="relative aspect-video bg-muted overflow-hidden flex-shrink-0">
        {thumbnailUrl && !imgError ? (
          <>
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
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-muted to-primary/10 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Hover play */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200">
          <div className={cn(
            "w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100",
            "transition-all duration-200"
          )}>
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Duration pill — bottom right */}
        {video.duration_minutes && (
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-mono font-medium rounded">
            {video.duration_minutes}m
          </div>
        )}

        {/* Watched badge — top right */}
        {isWatched && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-success flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Bonus badge — top left */}
        {isBonus && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-yellow-500/90 text-white rounded text-[9px] font-bold">
            BONUS
          </div>
        )}
      </div>

      {/* Card content — fixed height */}
      <div className="p-3 flex flex-col flex-1 min-h-[72px]">
        <div className="flex items-start gap-1.5 flex-1">
          <h3 className="font-semibold text-xs text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors flex-1">
            {highlightTitle || video.title}
          </h3>
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
            {hasNotes && <FileText className="w-3 h-3 text-primary/60" />}
            {isBookmarked && <Bookmark className="w-3 h-3 text-yellow-500" fill="currentColor" />}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-auto pt-1.5">
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-medium truncate">
            {video.category}
          </span>
          {isNew && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary">
              <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              New
            </span>
          )}
        </div>
        {bookmarkedAt && (
          <p className="text-[9px] text-muted-foreground mt-1">
            Saved {new Date(bookmarkedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
