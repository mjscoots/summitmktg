import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatChannelState {
  slug: string;
  label: string;
  icon: string | null;
  color: string | null;
  display_order: number;
  unread: number;
}

/**
 * Per-channel chat state: the visible channel list plus unread counts,
 * both resolved server side from `chat_read_state` (per channel).
 * ai-coach is excluded server side, so it never affects unread math.
 */
export function useChatChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannelState[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).rpc('get_chat_channel_state');
    if (error || !data) { setLoading(false); return; }
    const list = ((data.channels || []) as ChatChannelState[]).map((c) => ({ ...c, unread: c.unread || 0 }));
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

  // Live unread bumps for channels the user is not currently looking at
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('chat-channel-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const msg = payload.new as { user_id: string; channel: string };
        if (msg.user_id === user.id) return;
        const slug = msg.channel || 'general';
        if (slug === 'ai-coach') return;
        if (slug === activeRef.current) {
          void (supabase as any).rpc('mark_chat_channel_read', { _channel: slug, _all: false });
          return;
        }
        setChannels((prev) => {
          if (!prev.some((c) => c.slug === slug)) return prev;
          return prev.map((c) => (c.slug === slug ? { ...c, unread: c.unread + 1 } : c));
        });
        setTotalUnread((prev) => prev + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return { channels, totalUnread, loading, refresh, markChannelRead, markAllRead };
}
