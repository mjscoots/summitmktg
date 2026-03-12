import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Progress } from '@/components/ui/progress';
import { Video, Film, Star, Bookmark, Search, X, ChevronLeft, ArrowLeft, CheckCircle, Clock, Play, FileText } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { VideoCard } from '@/components/training/VideoCard';
import { useVideoBookmarks } from '@/hooks/useVideoBookmarks';
import { isBonusCategory } from '@/lib/trainingConstants';
import { SummitLoader } from '@/components/shared/SummitLoader';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

// 4 main category groups
const CATEGORY_GROUPS = [
  {
    key: 'patps',
    title: 'PATPs',
    description: 'Proven scripts & pitch frameworks',
    icon: '🎯',
    categories: ['Introduction', 'Switchover', 'Fresh Account'],
  },
  {
    key: 'core',
    title: 'Core Training',
    description: 'Master the fundamentals of selling',
    icon: '💪',
    categories: ['Body Language', 'Tonality'],
  },
  {
    key: 'closing',
    title: 'Objections & Closing',
    description: 'Handle objections and close the deal',
    icon: '🔥',
    categories: ['Objections', 'Closing', 'Advanced Training', 'Mental Mastery'],
  },
  {
    key: 'bonus',
    title: 'Bonus & Zoom',
    description: 'Extra resources & recorded sessions',
    icon: '⭐',
    categories: ['Manager Training', 'Zoom Trainings'],
  },
];

export default function TrainingVideosPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [noteVideoIds, setNoteVideoIds] = useState<Set<string>>(new Set());
  const { bookmarkedIds } = useVideoBookmarks();
  const [bookmarkData, setBookmarkData] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

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

  const requiredVideos = videos.filter(v => !isBonusCategory(v.category));
  const requiredWatchedCount = requiredVideos.filter(v => watchedIds.has(v.id)).length;
  const progressPercent = requiredVideos.length > 0 ? Math.round((requiredWatchedCount / requiredVideos.length) * 100) : 0;

  // Get videos for a category group
  const getGroupVideos = (groupKey: string) => {
    const group = CATEGORY_GROUPS.find(g => g.key === groupKey);
    if (!group) return [];
    return videos.filter(v => group.categories.includes(v.category));
  };

  const getGroupWatchedCount = (groupKey: string) => {
    return getGroupVideos(groupKey).filter(v => watchedIds.has(v.id)).length;
  };

  // Search results
  const searchResults = searchQuery.trim()
    ? videos.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const renderHighlightedTitle = (title: string) => {
    if (!searchQuery) return undefined;
    const q = searchQuery.toLowerCase();
    const idx = title.toLowerCase().indexOf(q);
    if (idx === -1) return undefined;
    return (
      <>
        {title.slice(0, idx)}
        <span className="font-bold text-primary">{title.slice(idx, idx + searchQuery.length)}</span>
        {title.slice(idx + searchQuery.length)}
      </>
    );
  };

  // Currently displayed videos
  const displayedVideos = searchQuery.trim()
    ? searchResults
    : activeGroup
      ? getGroupVideos(activeGroup)
      : [];

  const activeGroupData = CATEGORY_GROUPS.find(g => g.key === activeGroup);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <SummitLoader label="Loading videos..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PageBackButton to="/app/training" label="Training" />

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Videos</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Training library — watch, learn, level up</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-foreground">{requiredWatchedCount}<span className="text-muted-foreground font-medium text-base">/{requiredVideos.length}</span></p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">watched</p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-[11px] text-muted-foreground mt-1">{progressPercent}% complete</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setActiveGroup(null); }}
            placeholder="Search videos..."
            className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchQuery.trim() ? (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
            {searchResults.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No videos found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isWatched={watchedIds.has(video.id)}
                    onClick={() => navigate(`/app/training/videos/${video.id}`)}
                    highlightTitle={renderHighlightedTitle(video.title)}
                    hasNotes={noteVideoIds.has(video.id)}
                    isBookmarked={bookmarkedIds.has(video.id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : activeGroup ? (
          /* Category Detail View */
          <>
            <button
              onClick={() => setActiveGroup(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              All Categories
            </button>

            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{activeGroupData?.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-foreground">{activeGroupData?.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {getGroupWatchedCount(activeGroup)}/{getGroupVideos(activeGroup).length} watched
                </p>
              </div>
            </div>

            {displayedVideos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No videos in this category yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedVideos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isWatched={watchedIds.has(video.id)}
                    onClick={() => navigate(`/app/training/videos/${video.id}`)}
                    hasNotes={noteVideoIds.has(video.id)}
                    isBookmarked={bookmarkedIds.has(video.id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Category Selection View — the 4 main boxes */
          <>
            {/* Bookmarks quick-access */}
            {videos.filter(v => bookmarkedIds.has(v.id)).length > 0 && (
              <button
                onClick={() => setActiveGroup('bookmarks')}
                className="w-full flex items-center gap-3 p-4 mb-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Bookmarked Videos</p>
                  <p className="text-[11px] text-muted-foreground">{videos.filter(v => bookmarkedIds.has(v.id)).length} saved</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
              </button>
            )}

            {/* 4 Main Category Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORY_GROUPS.map(group => {
                const groupVideos = videos.filter(v => group.categories.includes(v.category));
                const watched = groupVideos.filter(v => watchedIds.has(v.id)).length;
                const total = groupVideos.length;
                const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
                const isBonus = group.key === 'bonus';

                if (total === 0) return null;

                return (
                  <button
                    key={group.key}
                    onClick={() => setActiveGroup(group.key)}
                    className={cn(
                      "text-left p-5 rounded-xl border transition-all group",
                      "bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                      isBonus ? "border-yellow-500/20" : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{group.icon}</span>
                      {isBonus && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 uppercase tracking-wider">
                          Optional
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors mb-0.5">
                      {group.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mb-3">{group.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">{total} video{total !== 1 ? 's' : ''}</span>
                      <span className={cn(
                        "text-xs font-bold",
                        pct === 100 ? "text-success" : pct > 0 ? "text-primary" : "text-muted-foreground"
                      )}>
                        {watched}/{total}
                      </span>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct === 100 ? "bg-success" : "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Recently Added — show newest videos with subtle "New" label */}
            {(() => {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              const newVideos = videos.filter(v => v.created_at && new Date(v.created_at) > sevenDaysAgo);
              if (newVideos.length === 0) return null;
              return (
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Recently Added
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {newVideos.slice(0, 4).map(video => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        isWatched={watchedIds.has(video.id)}
                        onClick={() => navigate(`/app/training/videos/${video.id}`)}
                        hasNotes={noteVideoIds.has(video.id)}
                        isBookmarked={bookmarkedIds.has(video.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Bookmarks sub-view */}
        {activeGroup === 'bookmarks' && !searchQuery.trim() && (
          <>
            <button
              onClick={() => setActiveGroup(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              All Categories
            </button>
            <div className="flex items-center gap-3 mb-5">
              <Bookmark className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-foreground">Bookmarked Videos</h2>
            </div>
            {videos.filter(v => bookmarkedIds.has(v.id)).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No bookmarked videos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.filter(v => bookmarkedIds.has(v.id)).sort((a, b) => {
                  const aDate = bookmarkData[a.id] || '';
                  const bDate = bookmarkData[b.id] || '';
                  return bDate.localeCompare(aDate);
                }).map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isWatched={watchedIds.has(video.id)}
                    onClick={() => navigate(`/app/training/videos/${video.id}`)}
                    hasNotes={noteVideoIds.has(video.id)}
                    isBookmarked={true}
                    bookmarkedAt={bookmarkData[video.id]}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
