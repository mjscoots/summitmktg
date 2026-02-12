import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Video, Play, CheckCircle, ChevronLeft, Loader2, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoSearchBar } from '@/components/training/VideoSearchBar';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

const CATEGORY_TABS = [
  'All Videos',
  'Introduction',
  'Switchover',
  'Fresh Account',
  'Body Language',
  'Tonality',
  'Objections',
  'Closing',
  'Advanced Training',
  'Mental Mastery',
  'Zoom Trainings',
  'Manager Training',
];

export default function TrainingVideosPage() {
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
        let query = supabase
          .from('training_videos')
          .select('*')
          .eq('is_active', true)
          .order('display_order')
          .order('created_at', { ascending: false });

        const { data: videosData } = await query;

        const filtered = (videosData || []).filter(v => {
          if (!v.target_role) return true;
          return v.target_role === role;
        });

        setVideos(filtered);

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
  }, [user, role]);

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

  const watchedCount = videos.filter(v => watchedIds.has(v.id)).length;
  const progressPercent = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0;

  // Highlight helper
  const highlightTitle = (title: string) => {
    if (!searchTerm) return title;
    const q = searchTerm.toLowerCase();
    const idx = title.toLowerCase().indexOf(q);
    if (idx === -1) return title;
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
            Training Videos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Watch training content to level up your skills</p>
        </div>

        {/* Progress Card */}
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Your Progress</span>
            <span className="text-sm text-muted-foreground">
              {watchedCount}/{videos.length} videos watched
            </span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-2">{progressPercent}% complete</p>
        </div>

        {/* Search Bar */}
        <VideoSearchBar
          videos={videos}
          categoryTabs={CATEGORY_TABS}
          activeCategory={activeCategory}
          onFilteredVideos={handleSearchResults}
          onCategoryChange={handleCategoryChange}
          onNavigateToVideo={(id) => navigate(`/app/training/videos/${id}`)}
        />

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {CATEGORY_TABS.map(cat => {
            const count = cat === 'All Videos' ? videos.length : videos.filter(v => v.category === cat).length;
            if (cat !== 'All Videos' && count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  // Clear search when switching tabs manually
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
                <p className="text-sm mt-1">Try searching a category like Introduction, Closing, or Body Language</p>
              </>
            ) : (
              <>
                <p>No videos in this category yet.</p>
                <p className="text-sm mt-1">Check back soon!</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedVideos.map(video => {
              const isWatched = watchedIds.has(video.id);
              return (
                <div
                  key={video.id}
                  onClick={() => navigate(`/app/training/videos/${video.id}`)}
                  className="group bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:border-primary/40"
                >
                  <div className="aspect-video bg-muted relative flex items-center justify-center">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <Video className="w-12 h-12 text-muted-foreground/50" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play className="w-7 h-7 text-primary-foreground ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                    {isWatched && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-success/90 text-white rounded-full text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" />
                        WATCHED
                      </div>
                    )}
                    {video.duration_minutes && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded">
                        {video.duration_minutes} min
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {highlightTitle(video.title)}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                        {video.category}
                      </span>
                      {video.target_role && (
                        <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground capitalize">
                          {video.target_role} only
                        </span>
                      )}
                    </div>
                    {video.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{video.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
