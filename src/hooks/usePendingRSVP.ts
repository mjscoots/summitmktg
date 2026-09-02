import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Count of outstanding RSVPs for the signed-in user.
 * Server-computed through get_action_cards - no browser-side recurrence expansion.
 */
export function usePendingRSVP() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) { setPendingCount(0); return; }

    let cancelled = false;
    const check = async () => {
      const { data, error } = await (supabase as any).rpc('get_action_cards');
      if (cancelled) return;
      if (error || !data) { setPendingCount(0); return; }
      const cards = (data.cards as { type: string }[]) || [];
      setPendingCount(cards.filter((c) => c.type === 'rsvp').length);
    };

    void check();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);

  return pendingCount;
}
