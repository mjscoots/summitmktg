import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LAST_READ_KEY = 'summit_chat_last_read';

function getCachedLastRead(): string | null {
  return localStorage.getItem(LAST_READ_KEY);
}

function setCachedLastRead(ts: string) {
  localStorage.setItem(LAST_READ_KEY, ts);
}

/**
 * Tracks unread chat message count.
 * - The last-read timestamp is persisted server side in `chat_read_state`, so
 *   it survives new devices, cleared browser storage and logouts. localStorage
 *   is only a cache for instant first paint.
 * - Only counts messages from other users, in real channels (excludes ai-coach).
 * - `markRead` stamps now() locally and remotely and resets the badge.
 * - `isViewing` prevents incrementing while the user has chat open.
 */
export function useUnreadChat() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isViewingRef = useRef(false);
  const lastReadRef = useRef<string | null>(getCachedLastRead());

  const persistLastRead = useCallback(
    async (ts: string) => {
      lastReadRef.current = ts;
      setCachedLastRead(ts);
      if (!user) return;
      try {
        await (supabase.from('chat_read_state' as any) as any).upsert(
          { user_id: user.id, last_read_at: ts },
          { onConflict: 'user_id' }
        );
      } catch {
        /* local cache still applies */
      }
    },
    [user]
  );

  const markRead = useCallback(() => {
    setUnreadCount(0);
    void persistLastRead(new Date().toISOString());
  }, [persistLastRead]);

  /** Call when entering/leaving the chat page */
  const setViewing = useCallback(
    (viewing: boolean) => {
      isViewingRef.current = viewing;
      if (viewing) markRead();
    },
    [markRead]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const resolveLastRead = async (): Promise<string> => {
      try {
        const { data } = await (supabase.from('chat_read_state' as any) as any)
          .select('last_read_at')
          .eq('user_id', user.id)
          .maybeSingle();

        const remote = (data as any)?.last_read_at as string | undefined;
        if (remote) {
          lastReadRef.current = remote;
          setCachedLastRead(remote);
          return remote;
        }
      } catch {
        /* fall through */
      }

      // No server state yet: adopt the cached value, or start the user from
      // "now" so a fresh account never sees a bogus 99+ backlog.
      const fallback = lastReadRef.current || new Date().toISOString();
      await persistLastRead(fallback);
      return fallback;
    };

    const fetchUnread = async () => {
      const lastRead = await resolveLastRead();
      if (cancelled) return;

      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastRead)
        .neq('user_id', user.id)
        .neq('channel', 'ai-coach');

      if (!cancelled && !error && count !== null) setUnreadCount(count);
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
            void persistLastRead(new Date().toISOString());
          } else {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, persistLastRead]);

  return { unreadCount, markRead, setViewing };
}
