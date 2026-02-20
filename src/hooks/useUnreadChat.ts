import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LAST_READ_KEY = 'summit_chat_last_read';

function getLastRead(): string {
  return localStorage.getItem(LAST_READ_KEY) || new Date(0).toISOString();
}

export function useUnreadChat() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const markRead = useCallback(() => {
    localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const lastRead = getLastRead();
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastRead)
        .neq('user_id', user.id);

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
          if (payload.new && (payload.new as any).user_id !== user.id) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount, markRead };
}
