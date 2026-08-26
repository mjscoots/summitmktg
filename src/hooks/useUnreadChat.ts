import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Total unread chat count across every channel the user can see.
 * Per-channel last-read timestamps live in `chat_read_state`; `get_conversations`
 * does the math (and excludes ai-coach), so the badge survives new devices.
 *
 * No message subscription here: the count refreshes on mount, on window focus
 * and when the caller's own read state changes.
 */
export function useUnreadChat() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isViewingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).rpc('get_conversations');
    if (error || !data) return;
    setUnreadCount(Number(data.total_unread) || 0);
  }, [user]);

  const markRead = useCallback(async () => {
    setUnreadCount(0);
    if (!user) return;
    await (supabase as any).rpc('mark_chat_channel_read', { _channel: null, _all: true });
  }, [user]);

  /** Call when entering/leaving the chat page */
  const setViewing = useCallback(
    (viewing: boolean) => {
      isViewingRef.current = viewing;
      if (viewing) void markRead();
    },
    [markRead]
  );

  useEffect(() => {
    if (!user) return;
    void refresh();
    const onFocus = () => { if (!isViewingRef.current) void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('focus', onFocus); };
  }, [user, refresh]);

  return { unreadCount, markRead, setViewing, refresh };
}
