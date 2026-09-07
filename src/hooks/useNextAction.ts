import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NextAction {
  /** The sentence on the row. */
  text: string;
  /** Where the row goes. */
  to: string;
}

/**
 * The one next action a home shows, chosen in a fixed order: an unread message
 * from the person's manager, an unanswered RSVP inside 48 hours, an unfinished
 * day one video while the recruit gate is on, then the next To do item. When
 * none of those exist the row is hidden, so nothing is invented to fill it.
 */
export function useNextAction() {
  const { user } = useAuth();
  const [action, setAction] = useState<NextAction | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;

    const [profileRes, convRes, cardRes, gateRes, todoRes] = await Promise.all([
      (supabase as any).from('profiles').select('manager_id').eq('user_id', user.id).maybeSingle(),
      (supabase as any).rpc('get_conversations'),
      (supabase as any).rpc('get_action_cards'),
      (supabase as any).rpc('recruit_gate_state'),
      (supabase as any)
        .from('todo_items')
        .select('title')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('display_order')
        .limit(1),
    ]);

    // 1. An unread direct message from their manager.
    const managerId = (profileRes.data as { manager_id: string | null } | null)?.manager_id || null;
    const dms = ((convRes.data?.dms as { slug: string; label: string; other_user_id: string | null; unread: number }[]) || []);
    const fromManager = managerId ? dms.find((d) => d.other_user_id === managerId && Number(d.unread) > 0) : null;
    if (fromManager) {
      setAction({ text: `Unread message from ${fromManager.label}`, to: `/app/chat?room=${fromManager.slug}` });
      setLoading(false);
      return;
    }

    // 2. An unanswered RSVP for an event in the next 48 hours.
    const cards = ((cardRes.data?.cards as { type: string; title: string; when_at?: string | null }[]) || []);
    const cutoff = Date.now() + 48 * 60 * 60 * 1000;
    const rsvp = cards.find(
      (c) => c.type === 'rsvp' && c.when_at && new Date(c.when_at).getTime() <= cutoff
    );
    if (rsvp) {
      setAction({ text: `Answer the RSVP for ${rsvp.title}`, to: '/app/events' });
      setLoading(false);
      return;
    }

    // 3. An unfinished day one video while the gate is on.
    const gate = (gateRes.data as { locked?: boolean; items?: { title: string; done: boolean }[] } | null) || {};
    const nextVideo = gate.locked ? (gate.items || []).find((i) => !i.done) : null;
    if (nextVideo) {
      setAction({ text: `Watch ${nextVideo.title}`, to: '/recruit-course' });
      setLoading(false);
      return;
    }

    // 4. The next To do item.
    const todo = ((todoRes.data as { title: string }[]) || [])[0];
    setAction(todo ? { text: todo.title, to: '/app/missions' } : null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { action, loading, refresh: load };
}
