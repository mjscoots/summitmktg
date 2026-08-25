import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Total unread chat count across every channel the user can see.
 * Per-channel last-read timestamps live in `chat_read_state`; the server RPC
 * does the math (and excludes ai-coach), so the badge survives new devices.
 */
export function useUnreadChat() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isViewingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).rpc('get_chat_channel_state');
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

    const channel = supabase
      .channel('unread-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as { user_id: string; channel: string };
          if (msg.user_id === user.id) return;
          if (msg.channel === 'ai-coach') return;
          if (isViewingRef.current) return;
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  return { unreadCount, markRead, setViewing, refresh };
}
