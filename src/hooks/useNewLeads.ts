import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Live count of unclaimed leads sitting on the board.
 * Used for the sidebar "Recruits" badge (same pattern as the Chat badge).
 */
export function useNewLeads() {
  const { user } = useAuth();
  const [newCount, setNewCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).rpc('get_new_lead_count');
    if (!error && typeof data === 'number') setNewCount(data);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();

    const channel = supabase
      .channel('recruiting-leads-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruiting_leads' }, () => {
        refresh();
      })
      .subscribe();

    const interval = window.setInterval(refresh, 60_000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [user, refresh]);

  return { newCount, refresh };
}
