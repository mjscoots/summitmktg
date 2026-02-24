import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LAST_READ_KEY = 'summit_chat_last_read';

function getLastRead(): string {
  return localStorage.getItem(LAST_READ_KEY) || new Date(0).toISOString();
}

function setLastRead(ts: string) {
  localStorage.setItem(LAST_READ_KEY, ts);
}

/**
 * Tracks unread chat message count.
 * - Only counts messages from other users
 * - Only counts messages in real channels (excludes ai-coach which is local-only)
 * - Exposes `markRead` to stamp current time and reset count
 * - `isViewing` flag prevents incrementing while user has chat open
 */
export function useUnreadChat() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isViewingRef = useRef(false);

  const markRead = useCallback(() => {
    setLastRead(new Date().toISOString());
    setUnreadCount(0);
  }, []);

  /** Call when entering/leaving the chat page */
  const setViewing = useCallback((viewing: boolean) => {
    isViewingRef.current = viewing;
    if (viewing) {
      markRead();
    }
  }, [markRead]);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const lastRead = getLastRead();
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastRead)
        .neq('user_id', user.id)
        .neq('channel', 'ai-coach');

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnread();

    const channel = supabase
      .channel('unread-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as { user_id: string; channel: string };
          if (msg.user_id === user.id) return;
          if (msg.channel === 'ai-coach') return;

          if (isViewingRef.current) {
            // User is on the chat page — update the last-read timestamp
            // so the count stays at 0
            setLastRead(new Date().toISOString());
          } else {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount, markRead, setViewing };
}
