import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Progress } from '@/components/ui/progress';
import { Video, Loader2, Film, Star, Bookmark } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { VideoSearchBar } from '@/components/training/VideoSearchBar';
import { VideoCard } from '@/components/training/VideoCard';
import { useVideoBookmarks } from '@/hooks/useVideoBookmarks';
import { REQUIRED_CATEGORY_TABS, BONUS_CATEGORY_TABS, isBonusCategory } from '@/lib/trainingConstants';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

const CATEGORY_TABS = [...REQUIRED_CATEGORY_TABS, ...BONUS_CATEGORY_TABS];

export default function TrainingVideosPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All Videos');
  const [noteVideoIds, setNoteVideoIds] = useState<Set<string>>(new Set());
  const { bookmarkedIds } = useVideoBookmarks();

  // Bookmarked videos data (with bookmarked_at timestamps)
  const [bookmarkData, setBookmarkData] = useState<Record<string, string>>({});

  const [searchFilteredVideos, setSearchFilteredVideos] = useState<TrainingVideo[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [videosRes, progressRes, notesRes, bookmarksRes] = await Promise.all([
          supabase.from('training_videos').select('*').eq('is_active', true).order('display_order').order('created_at', { ascending: false }),
          supabase.from('video_progress').select('video_id').eq('user_id', user.id).eq('watched', true),
          supabase.from('video_notes').select('video_id').eq('user_id', user.id),
          supabase.from('video_bookmarks').select('video_id, bookmarked_at').eq('user_id', user.id),
        ]);

        const filtered = (videosRes.data || []).filter(v => {
          if (!v.target_role) return true;
          return v.target_role === role;
        });
        setVideos(filtered);
        setWatchedIds(new Set((progressRes.data || []).map(p => p.video_id)));
        setNoteVideoIds(new Set((notesRes.data || []).map(n => n.video_id)));

        const bData: Record<string, string> = {};
        (bookmarksRes.data || []).forEach(b => { bData[b.video_id] = b.bookmarked_at || ''; });
        setBookmarkData(bData);
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

  // Special "Bookmarks" category
  const isBookmarksTab = activeCategory === 'Bookmarks';

  // Build a category order map for sorting
  const CATEGORY_ORDER = [...REQUIRED_CATEGORY_TABS.filter(c => c !== 'All Videos'), ...BONUS_CATEGORY_TABS];
  const getCatOrder = (cat: string) => {
    const idx = CATEGORY_ORDER.indexOf(cat);
    return idx >= 0 ? idx : 999;
  };

  const categoryFiltered = isBookmarksTab
    ? videos.filter(v => bookmarkedIds.has(v.id)).sort((a, b) => {
        const aDate = bookmarkData[a.id] || '';
        const bDate = bookmarkData[b.id] || '';
        return bDate.localeCompare(aDate);
      })
    : activeCategory === 'All Videos'
      ? [...videos].sort((a, b) => {
          // Bookmarked videos first
          const aBookmarked = bookmarkedIds.has(a.id) ? 0 : 1;
          const bBookmarked = bookmarkedIds.has(b.id) ? 0 : 1;
          if (aBookmarked !== bBookmarked) return aBookmarked - bBookmarked;
          // Then by category order
          const catDiff = getCatOrder(a.category) - getCatOrder(b.category);
          if (catDiff !== 0) return catDiff;
          // Then by display_order within category
          return (a.display_order ?? 0) - (b.display_order ?? 0);
        })
      : videos.filter(v => v.category === activeCategory);

  const displayedVideos = searchTerm ? (searchFilteredVideos || []) : categoryFiltered;

  const requiredVideos = videos.filter(v => !isBonusCategory(v.category));
  const bonusVideos = videos.filter(v => isBonusCategory(v.category));
  const requiredWatchedCount = requiredVideos.filter(v => watchedIds.has(v.id)).length;
  const bonusWatchedCount = bonusVideos.filter(v => watchedIds.has(v.id)).length;
  const progressPercent = requiredVideos.length > 0 ? Math.round((requiredWatchedCount / requiredVideos.length) * 100) : 0;

  const bookmarkCount = videos.filter(v => bookmarkedIds.has(v.id)).length;

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
        {/* Back Button */}
        <PageBackButton to="/app/training" label="Training" />

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
            <span className="text-sm font-medium text-foreground">Required Progress</span>
            <span className="text-sm text-muted-foreground">
              {requiredWatchedCount}/{requiredVideos.length} required videos watched
            </span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">{progressPercent}% complete</p>
            {bonusVideos.length > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                {bonusWatchedCount} bonus watched
              </p>
            )}
          </div>
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
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none items-center">
          {/* All Videos tab */}
          <button
            onClick={() => {
              setActiveCategory('All Videos');
              setSearchTerm('');
              setSearchFilteredVideos(null);
            }}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeCategory === 'All Videos'
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            All Videos
            <span className="ml-1.5 opacity-70">({requiredVideos.length})</span>
          </button>

          {/* Bookmarks tab — right after All Videos */}
          <button
            onClick={() => {
              setActiveCategory('Bookmarks');
              setSearchTerm('');
              setSearchFilteredVideos(null);
            }}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
              activeCategory === 'Bookmarks'
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Bookmarks
            {bookmarkCount > 0 && <span className="opacity-70">({bookmarkCount})</span>}
          </button>

          {/* Required category tabs (skip All Videos, already rendered) */}
          {REQUIRED_CATEGORY_TABS.filter(cat => cat !== 'All Videos').map(cat => {
            const count = videos.filter(v => v.category === cat).length;
            if (count === 0) return null;
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
                <span className="ml-1.5 opacity-70">({count})</span>
              </button>
            );
          })}

          {/* Divider */}
          {BONUS_CATEGORY_TABS.some(cat => videos.some(v => v.category === cat)) && (
            <div className="flex items-center gap-2 mx-1">
              <div className="w-px h-6 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 whitespace-nowrap flex items-center gap-1">
                <Star className="w-3 h-3" />
                Bonus
              </span>
              <div className="w-px h-6 bg-border" />
            </div>
          )}

          {/* Bonus category tabs */}
          {BONUS_CATEGORY_TABS.map(cat => {
            const count = videos.filter(v => v.category === cat).length;
            if (count === 0) return null;
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
                    ? "bg-yellow-500/90 text-white"
                    : "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30"
                )}
              >
                {cat}
                <span className="ml-1.5 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Video Grid */}
        {displayedVideos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {isBookmarksTab ? (
              <>
                <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <p>No bookmarked videos yet.</p>
                <p className="text-sm mt-1">Click ⭐ on any video to bookmark it for quick access.</p>
              </>
            ) : (
              <>
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
                hasNotes={noteVideoIds.has(video.id)}
                isBookmarked={bookmarkedIds.has(video.id)}
                bookmarkedAt={isBookmarksTab ? bookmarkData[video.id] : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
