import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Video, ChevronLeft, Loader2, Film, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoSearchBar } from '@/components/training/VideoSearchBar';
import { VideoCard } from '@/components/training/VideoCard';
import { isBonusCategory } from '@/lib/trainingConstants';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

// Manager video categories
const MANAGER_CATEGORIES = ['All Videos', 'Advanced Training', 'Manager Training', 'Zoom Trainings'];

export default function ManagerTrainingVideosPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All Videos');

  // Search state
  const [searchFilteredVideos, setSearchFilteredVideos] = useState<TrainingVideo[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: videosData } = await supabase
          .from('training_videos')
          .select('*')
          .eq('is_active', true)
          .in('category', ['Advanced Training', 'Manager Training', 'Zoom Trainings'])
          .order('display_order')
          .order('created_at', { ascending: false });

        setVideos(videosData || []);

        const { data: progressData } = await supabase
          .from('video_progress')
          .select('video_id')
          .eq('user_id', user.id)
          .eq('watched', true);

        setWatchedIds(new Set((progressData || []).map(p => p.video_id)));
      } catch (err) {
        console.error('Error fetching videos:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSearchResults = useCallback((filtered: TrainingVideo[], term: string) => {
    setSearchTerm(term);
    setSearchFilteredVideos(term ? filtered : null);
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
  }, []);

  // Determine displayed videos
  const categoryFiltered = activeCategory === 'All Videos'
    ? videos
    : videos.filter(v => v.category === activeCategory);

  const displayedVideos = searchTerm ? (searchFilteredVideos || []) : categoryFiltered;

  // Progress tracking
  const totalVideos = videos.length;
  const watchedCount = videos.filter(v => watchedIds.has(v.id)).length;
  const progressPercent = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;

  // Highlight helper for search
  const renderHighlightedTitle = (title: string) => {
    if (!searchTerm) return undefined;
    const q = searchTerm.toLowerCase();
    const idx = title.toLowerCase().indexOf(q);
    if (idx === -1) return undefined;
    return (
      <>
        {title.slice(0, idx)}
        <span className="font-bold text-primary">{title.slice(idx, idx + searchTerm.length)}</span>
        {title.slice(idx + searchTerm.length)}
      </>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          onClick={() => navigate('/app/training')}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Training
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Video className="w-7 h-7 text-primary" />
            Manager Training Videos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Advanced and manager-level training content</p>
        </div>

        {/* Progress Card */}
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Progress</span>
            <span className="text-sm text-muted-foreground">
              {watchedCount}/{totalVideos} videos watched
            </span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-2">{progressPercent}% complete</p>
        </div>

        {/* Search Bar */}
        <VideoSearchBar
          videos={videos}
          categoryTabs={MANAGER_CATEGORIES}
          activeCategory={activeCategory}
          onFilteredVideos={handleSearchResults}
          onCategoryChange={handleCategoryChange}
          onNavigateToVideo={(id) => navigate(`/app/training/videos/${id}`)}
        />

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none items-center">
          {MANAGER_CATEGORIES.map(cat => {
            const count = cat === 'All Videos' ? videos.length : videos.filter(v => v.category === cat).length;
            if (cat !== 'All Videos' && count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSearchTerm('');
                  setSearchFilteredVideos(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {cat}
                {count > 0 && <span className="ml-1.5 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Video Grid */}
        {displayedVideos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Film className="w-16 h-16 mx-auto mb-4 opacity-40" />
            {searchTerm ? (
              <>
                <p>No videos found for "{searchTerm}"</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <p>No videos in this category yet.</p>
                <p className="text-sm mt-1">Check back soon!</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {displayedVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                isWatched={watchedIds.has(video.id)}
                onClick={() => navigate(`/app/training/videos/${video.id}`)}
                highlightTitle={renderHighlightedTitle(video.title)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
