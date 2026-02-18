import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  userId: string;
  fullName: string;
}

export function useTypingIndicator(channelName: string = 'chat-typing') {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];

        Object.entries(state).forEach(([key, presences]) => {
          if (key === user.id) return; // exclude self
          const p = presences[0] as any;
          if (p?.isTyping) {
            users.push({ userId: key, fullName: p.fullName || 'Someone' });
          }
        });

        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ isTyping: false, fullName: profile?.full_name || 'User' });
        }
      });

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, profile?.full_name, channelName]);

  const startTyping = useCallback(() => {
    if (!channelRef.current || isTypingRef.current) return;
    isTypingRef.current = true;
    channelRef.current.track({ isTyping: true, fullName: profile?.full_name || 'User' });

    // Auto-stop after 3 seconds of no input
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [profile?.full_name]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current) return;
    isTypingRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    channelRef.current.track({ isTyping: false, fullName: profile?.full_name || 'User' });
  }, [profile?.full_name]);

  const handleInputChange = useCallback(() => {
    startTyping();
    // Reset the stop timeout on each keystroke
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [startTyping, stopTyping]);

  return { typingUsers, handleInputChange, stopTyping };
}
