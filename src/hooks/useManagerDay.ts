import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface ManagerDay {
  is_manager?: boolean;
  radar_count?: number;
  owed_count?: number;
  stuck_count?: number;
  stuck_ids?: string[];
  blitz_event_id?: string | null;
  blitz_title?: string | null;
  blitz_open_count?: number;
  blitz_names?: string[];
  awaiting_count?: number;
}

/**
 * The five counts behind the Today screen. Scope is decided by the database
 * (manager_day), so a rep gets an empty object and never a broader list.
 */
export function useManagerDay() {
  const { user, isLoading: authLoading } = useAuth();
  const { activeVertical } = useWorkspace();
  const [day, setDay] = useState<ManagerDay>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('manager_day', { _vertical: activeVertical });
    setDay((data as ManagerDay) || {});
    setLoading(false);
  }, [activeVertical]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [load, authLoading, user]);

  const total =
    (day.radar_count || 0) +
    (day.owed_count || 0) +
    (day.stuck_count || 0) +
    (day.blitz_open_count || 0) +
    (day.awaiting_count || 0);

  return { day, loading, total, isManager: Boolean(day.is_manager), refresh: load };
}
