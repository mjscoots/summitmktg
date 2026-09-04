import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatConversation {
  slug: string;
  label: string;
  icon: string | null;
  color: string | null;
  display_order: number;
  /** 'channel' | 'team' | 'dm' */
  kind: string;
  is_pinned: boolean;
  last_content: string | null;
  last_at: string | null;
  last_sender: string | null;
  unread: number;
  /** Direct messages only. */
  avatar_url?: string | null;
  other_user_id?: string | null;
  /** The industry this room belongs to. NULL is All Summit. */
  vertical?: string | null;
  /** Group rooms only: object path of the cover photo. */
  cover_image_path?: string | null;
  /** This person muted the room: readable, but quiet. */
  is_muted?: boolean;
}



/**
 * The conversation list: channels, last line, sender, time and unread count,
 * all resolved server side by `get_conversations()` in one round trip.
 * ai-coach is excluded server side, so it never affects unread math.
 *
 * Unread counts refresh on mount, on window focus and when the caller's own
 * `chat_read_state` changes - no subscription to every message in the company.
 */
export function useChatChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatConversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).rpc('get_conversations');
    if (error || !data) { setLoading(false); return; }
    const list = ((data.conversations || []) as ChatConversation[]).map((c) => ({ ...c, unread: c.unread || 0 }));
    setChannels(list);
    setTotalUnread(Number(data.total_unread) || 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const markChannelRead = useCallback(async (slug: string) => {
    activeRef.current = slug;
    setChannels((prev) => prev.map((c) => (c.slug === slug ? { ...c, unread: 0 } : c)));
    setTotalUnread((prev) => {
      const was = channels.find((c) => c.slug === slug)?.unread || 0;
      return Math.max(0, prev - was);
    });
    await (supabase as any).rpc('mark_chat_channel_read', { _channel: slug, _all: false });
  }, [channels]);

  const markAllRead = useCallback(async () => {
    setChannels((prev) => prev.map((c) => ({ ...c, unread: 0 })));
    setTotalUnread(0);
    await (supabase as any).rpc('mark_chat_channel_read', { _channel: null, _all: true });
  }, []);

  // Two lightweight subscriptions: the caller's own read state, and new
  // messages anywhere the caller can read. The message stream is debounced so a
  // busy room costs one refresh, not one per message.
  useEffect(() => {
    if (!user) return;
    let timer: number | null = null;
    const debounced = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => { void refresh(); }, 500);
    };
    const ch = supabase
      .channel(`chat-read-state-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_read_state', filter: `user_id=eq.${user.id}` },
        () => { void refresh(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => { debounced(); }
      )
      .subscribe();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);


  return { channels, totalUnread, loading, refresh, markChannelRead, markAllRead };
}
