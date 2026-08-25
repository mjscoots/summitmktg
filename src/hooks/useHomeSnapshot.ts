import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface HomeSnapshot {
  events_today: number;
  next_event: { title: string; event_date: string; event_type: string | null } | null;
  unclaimed_leads: number;
  lead_at_risk: { first_name: string; hours_left: number } | null;
  next_lesson: { lesson_id: string; title: string; course_slug: string; module_title: string } | null;
  week_points: number;
  team_signs: number;
  is_staff: boolean;
  is_admin: boolean;
  team_active_today: number;
  team_stale_48h: number;
  pending_queue: number;
}

export function useHomeSnapshot() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      const { data: raw } = await (supabase.rpc as any)('get_home_snapshot');
      if (raw) setData(raw as HomeSnapshot);
    } catch {
      /* non-fatal */
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, isLoading, refetch: fetch };
}
