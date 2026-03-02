import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useVideoBookmarks() {
  const { user } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('video_bookmarks')
        .select('video_id')
        .eq('user_id', user.id);
      setBookmarkedIds(new Set((data || []).map(d => d.video_id)));
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const toggleBookmark = useCallback(async (videoId: string) => {
    if (!user) return;
    const isBookmarked = bookmarkedIds.has(videoId);

    if (isBookmarked) {
      setBookmarkedIds(prev => { const s = new Set(prev); s.delete(videoId); return s; });
      const { error } = await supabase
        .from('video_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', videoId);
      if (error) {
        setBookmarkedIds(prev => new Set(prev).add(videoId));
        toast.error('Failed to remove bookmark');
      } else {
        toast.success('Removed from bookmarks');
      }
    } else {
      setBookmarkedIds(prev => new Set(prev).add(videoId));
      const { error } = await supabase
        .from('video_bookmarks')
        .insert({ user_id: user.id, video_id: videoId });
      if (error) {
        setBookmarkedIds(prev => { const s = new Set(prev); s.delete(videoId); return s; });
        toast.error('Failed to bookmark');
      } else {
        toast.success('Added to bookmarks');
      }
    }
  }, [user, bookmarkedIds]);

  return { bookmarkedIds, toggleBookmark, isLoading };
}
