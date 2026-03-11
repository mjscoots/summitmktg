import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Video, Loader2, Film, Bookmark, Shield, Pencil, Check, X } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { VideoSearchBar } from '@/components/training/VideoSearchBar';
import { VideoCard } from '@/components/training/VideoCard';
import { useVideoBookmarks } from '@/hooks/useVideoBookmarks';
import { ALL_VIDEO_CATEGORIES } from '@/lib/trainingConstants';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

export default function VideosPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [noteVideoIds, setNoteVideoIds] = useState<Set<string>>(new Set());
  const { bookmarkedIds } = useVideoBookmarks();
  const [bookmarkData, setBookmarkData] = useState<Record<string, string>>({});
  const [searchFilteredVideos, setSearchFilteredVideos] = useState<TrainingVideo[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editRole, setEditRole] = useState<string | null>(null);

  const isAdmin = role === 'admin' || role === 'owner';
  const isManager = role === 'manager' || isAdmin;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [videosRes, progressRes, notesRes, bookmarksRes] = await Promise.all([
        supabase.from('training_videos').select('*').eq('is_active', true).order('display_order').order('created_at', { ascending: false }),
        supabase.from('video_progress').select('video_id').eq('user_id', user.id).eq('watched', true),
        supabase.from('video_notes').select('video_id').eq('user_id', user.id),
        supabase.from('video_bookmarks').select('video_id, bookmarked_at').eq('user_id', user.id),
      ]);

      // Role filtering: rookies see only rookie (null or rookie), managers see all but with badge
      const filtered = (videosRes.data || []).filter(v => {
        if (isManager) return true; // managers/admin/owner see everything
        // Rookies: see videos with no target_role or target_role = 'rookie'
        return !v.target_role || v.target_role === 'rookie';
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
  }, [user, isManager]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchResults = useCallback((filtered: TrainingVideo[], term: string) => {
    setSearchTerm(term);
    setSearchFilteredVideos(term ? filtered : null);
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
  }, []);

  const isBookmarksTab = activeCategory === 'Bookmarks';

  // Build categories from actual videos
  const categories = ['All', 'Bookmarks', ...ALL_VIDEO_CATEGORIES.filter(cat => videos.some(v => v.category === cat))];

  const categoryFiltered = isBookmarksTab
    ? videos.filter(v => bookmarkedIds.has(v.id)).sort((a, b) => {
        const aDate = bookmarkData[a.id] || '';
        const bDate = bookmarkData[b.id] || '';
        return bDate.localeCompare(aDate);
      })
    : activeCategory === 'All'
      ? [...videos].sort((a, b) => {
          const aBookmarked = bookmarkedIds.has(a.id) ? 0 : 1;
          const bBookmarked = bookmarkedIds.has(b.id) ? 0 : 1;
          if (aBookmarked !== bBookmarked) return aBookmarked - bBookmarked;
          return (a.display_order ?? 0) - (b.display_order ?? 0);
        })
      : videos.filter(v => v.category === activeCategory);

  const displayedVideos = searchTerm ? (searchFilteredVideos || []) : categoryFiltered;

  const watchedCount = videos.filter(v => watchedIds.has(v.id)).length;
  const bookmarkCount = videos.filter(v => bookmarkedIds.has(v.id)).length;

  // Admin: save title/role edits
  const handleSaveEdit = async (videoId: string) => {
    const { error } = await supabase
      .from('training_videos')
      .update({
        title: editTitle,
        target_role: editRole as any,
      })
      .eq('id', videoId);

    if (error) {
      toast.error('Failed to update video');
    } else {
      toast.success('Video updated');
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, title: editTitle, target_role: editRole as any } : v));
    }
    setEditingId(null);
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
        <PageBackButton to="/app" label="Dashboard" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Video className="w-7 h-7 text-primary" />
            Videos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {watchedCount}/{videos.length} watched
          </p>
        </div>

        {/* Search Bar */}
        <VideoSearchBar
          videos={videos}
          categoryTabs={categories}
          activeCategory={activeCategory}
          onFilteredVideos={handleSearchResults}
          onCategoryChange={handleCategoryChange}
          onNavigateToVideo={(id) => navigate(`/app/videos/${id}`)}
        />

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none items-center">
          {categories.map(cat => {
            const count = cat === 'All' ? videos.length
              : cat === 'Bookmarks' ? bookmarkCount
              : videos.filter(v => v.category === cat).length;
            if (count === 0 && cat !== 'Bookmarks') return null;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSearchTerm('');
                  setSearchFilteredVideos(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {cat === 'Bookmarks' && <Bookmark className="w-3.5 h-3.5" />}
                {cat}
                {count > 0 && <span className="opacity-70">({count})</span>}
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
              </>
            ) : (
              <>
                <Film className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <p>{searchTerm ? `No videos found for "${searchTerm}"` : 'No videos in this category yet.'}</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {displayedVideos.map(video => (
              <div key={video.id} className="relative group/card">
                {/* Manager badge for manager-specific videos */}
                {isManager && video.target_role === 'manager' && (
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 bg-primary/90 text-primary-foreground rounded-full text-[10px] font-bold tracking-wide">
                    <Shield className="w-3 h-3" />
                    MGR
                  </div>
                )}

                {/* Admin edit button */}
                {isAdmin && editingId !== video.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(video.id);
                      setEditTitle(video.title);
                      setEditRole(video.target_role);
                    }}
                    className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-muted/90 border border-border flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity"
                  >
                    <Pencil className="w-3.5 h-3.5 text-foreground" />
                  </button>
                )}

                {/* Inline editor */}
                {editingId === video.id ? (
                  <div className="rounded-xl bg-card border border-primary/30 p-4 space-y-3">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditRole(null)}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          editRole === null ? "bg-primary/15 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground"
                        )}
                      >
                        All (Rookie)
                      </button>
                      <button
                        onClick={() => setEditRole('manager')}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          editRole === 'manager' ? "bg-primary/15 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground"
                        )}
                      >
                        Manager Only
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(video.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <VideoCard
                    video={video}
                    isWatched={watchedIds.has(video.id)}
                    onClick={() => navigate(`/app/videos/${video.id}`)}
                    hasNotes={noteVideoIds.has(video.id)}
                    isBookmarked={bookmarkedIds.has(video.id)}
                    bookmarkedAt={isBookmarksTab ? bookmarkData[video.id] : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
