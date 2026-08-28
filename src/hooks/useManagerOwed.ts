import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ManagerOwed {
  scope: 'all' | 'vertical' | 'downline' | 'none';
  calls_due: number;
  apps_owned: number;
  apps_unclaimed_old: number;
  reps_no_training: number;
  one_on_ones_missing: number;
  reps_no_three: number;
  total: number;
}

const EMPTY: ManagerOwed = {
  scope: 'none',
  calls_due: 0,
  apps_owned: 0,
  apps_unclaimed_old: 0,
  reps_no_training: 0,
  one_on_ones_missing: 0,
  reps_no_three: 0,
  total: 0,
};

/** What the signed-in manager owes this week. Counts come straight from the database. */
export function useManagerOwed() {
  const { user } = useAuth();
  const [owed, setOwed] = useState<ManagerOwed>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setOwed(EMPTY);
      setLoading(false);
      return;
    }
    const { data } = await (supabase.rpc as any)('manager_owed');
    setOwed(data ? ({ ...EMPTY, ...(data as ManagerOwed) }) : EMPTY);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { owed, loading, refresh };
}
