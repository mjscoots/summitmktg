import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Consecutive days with at least one logged sale, counted in the person's own
 * timezone from today (or yesterday, so a streak survives until the day ends).
 * Reads only rows the person already owns; nothing is invented.
 */
export function useSaleStreak(): { days: number; loading: boolean } {
  const { user } = useAuth();
  const [days, setDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data } = await (supabase as any)
        .from('sales_log')
        .select('sold_at')
        .eq('user_id', user.id)
        .gte('sold_at', since.toISOString());

      if (cancelled) return;
      const rows = (data as { sold_at: string }[] | null) || [];
      const keys = new Set(
        rows.map((r) => {
          const d = new Date(r.sold_at);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
      );
      const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      const cursor = new Date();
      if (!keys.has(keyOf(cursor))) cursor.setDate(cursor.getDate() - 1);
      let count = 0;
      while (keys.has(keyOf(cursor))) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      setDays(count);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { days, loading };
}
