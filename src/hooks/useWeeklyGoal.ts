import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const DEFAULT_WEEKLY_GOAL = 10;

/** The rep's own weekly sales goal, stored on their profile. */
export function useWeeklyGoal() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<number>(DEFAULT_WEEKLY_GOAL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('weekly_goal')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const value = (data as { weekly_goal: number | null } | null)?.weekly_goal;
      setGoal(value && value > 0 ? value : DEFAULT_WEEKLY_GOAL);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(
    async (next: number) => {
      if (!user) return;
      const clamped = Math.max(1, Math.min(200, Math.round(next)));
      setGoal(clamped);
      await (supabase as any).from('profiles').update({ weekly_goal: clamped }).eq('user_id', user.id);
    },
    [user]
  );

  return { goal, loading, save };
}
