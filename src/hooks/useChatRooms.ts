import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatChannels, type ChatConversation } from '@/hooks/useChatChannels';

export interface ChatRoom {
  slug: string;
  label: string;
  unread: number;
  /** 'mine' for the caller's own team room. */
  tone: 'mine' | 'room';
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Rooms shown in the strip, in order. Everything comes from existing channels. */
export function useChatRooms() {
  const { profile } = useAuth();
  const { channels, totalUnread, refresh, markChannelRead } = useChatChannels();
  const [myTeamSlug, setMyTeamSlug] = useState<string | null>(null);
  const [myTeamName, setMyTeamName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.team_id) { setMyTeamSlug(null); setMyTeamName(null); return; }
      const { data } = await supabase.from('teams').select('name').eq('id', profile.team_id).maybeSingle();
      if (cancelled || !data?.name) return;
      setMyTeamName(data.name);
      setMyTeamSlug(`team-${slugify(data.name)}`);
    })();
    return () => { cancelled = true; };
  }, [profile?.team_id]);

  const dmUnread = useMemo(
    () => channels.filter((c) => c.kind === 'dm').reduce((sum, c) => sum + (c.unread || 0), 0),
    [channels]
  );

  const rooms = useMemo<ChatRoom[]>(() => {
    const rooms = channels.filter((c) => c.kind !== 'dm' && c.slug !== 'ai-coach');
    const bySlug = new Map<string, ChatConversation>(rooms.map((c) => [c.slug, c]));
    const out: ChatRoom[] = [];
    const push = (c: ChatConversation | undefined, label?: string, tone: 'mine' | 'room' = 'room') => {
      if (!c || out.some((r) => r.slug === c.slug)) return;
      out.push({ slug: c.slug, label: label || c.label, unread: c.unread || 0, tone });
    };

    const mine = myTeamSlug ? bySlug.get(myTeamSlug) : undefined;
    push(mine, myTeamName || undefined, 'mine');
    push(bySlug.get('general'), 'Summit');
    push(bySlug.get('managers'));
    rooms
      .filter((c) => !c.slug.startsWith('team-'))
      .forEach((c) => push(c));
    rooms
      .filter((c) => c.slug.startsWith('team-'))
      .forEach((c) => push(c));
    return out;
  }, [channels, myTeamSlug, myTeamName]);

  /** Where Chat lands: the person's own team room, else the Summit room. */
  const homeRoom = useMemo(() => {
    if (myTeamSlug && rooms.some((r) => r.slug === myTeamSlug)) return myTeamSlug;
    return rooms.some((r) => r.slug === 'general') ? 'general' : rooms[0]?.slug || 'general';
  }, [rooms, myTeamSlug]);

  return {
    rooms,
    homeRoom,
    myTeamSlug,
    dms: channels.filter((c) => c.kind === 'dm'),
    dmUnread,
    totalUnread,
    refresh,
    markChannelRead,
  };
}
