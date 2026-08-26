import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ActionCard {
  type: 'rsvp' | 'incentive' | 'announcement';
  id: string;
  title: string;
  when_at?: string | null;
  location?: string | null;
  event_kind?: string | null;
  rsvp_deadline?: string | null;
  questions?: { key?: string; label?: string; options?: string[] }[];
  metric?: string | null;
  target?: number | null;
  ends_on?: string | null;
  prize_note?: string | null;
  body?: string | null;
}

/** Server-computed list of things the caller still has to act on. */
export function useActionCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setCards([]); setLoading(false); return; }
    const { data, error } = await (supabase as any).rpc('get_action_cards');
    if (error || !data) { setCards([]); setLoading(false); return; }
    setCards(((data.cards as ActionCard[]) || []).filter(Boolean));
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const dismiss = useCallback((type: string, id: string) => {
    setCards((prev) => prev.filter((c) => !(c.type === type && c.id === id)));
  }, []);

  return { cards, loading, refresh, dismiss };
}
