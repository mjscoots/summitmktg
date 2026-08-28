import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';

export interface BlitzCount {
  optin_count: number;
  i_am_in: boolean;
}

export interface OptedRep {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

/**
 * Pass 92 — blitz opt-ins. Counts come from one authenticated RPC so a rep can
 * see "7 of 12 in" without reading anyone else's row; the opted roster only
 * loads for managers and above.
 */
export function useBlitzOptins(blitzKeys: string[]) {
  const { user, role } = useAuth();
  const isLead = isManagerOrAbove(role);
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [counts, setCounts] = useState<Record<string, BlitzCount>>({});
  const [roster, setRoster] = useState<Record<string, OptedRep[]>>({});

  const keySig = blitzKeys.join('|');

  const load = useCallback(async () => {
    if (!user) return;
    const [countRes, enrollRes] = await Promise.all([
      (supabase as any).rpc('blitz_optin_counts'),
      (supabase as any)
        .from('rep_vertical_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('vertical', 'Fiber')
        .maybeSingle(),
    ]);
    const map: Record<string, BlitzCount> = {};
    for (const row of (countRes.data as
      | { blitz_key: string; optin_count: number; i_am_in: boolean }[]
      | null) || []) {
      map[row.blitz_key] = { optin_count: row.optin_count, i_am_in: row.i_am_in };
    }
    setCounts(map);
    setEligible(Boolean(enrollRes.data));

    if (isLead) {
      const keys = keySig ? keySig.split('|') : [];
      const rosterMap: Record<string, OptedRep[]> = {};
      if (keys.length) {
        const { data } = await (supabase as any)
          .from('blitz_optins')
          .select('blitz_key, user_id')
          .in('blitz_key', keys);
        const rows = (data as { blitz_key: string; user_id: string }[]) || [];
        const ids = [...new Set(rows.map((r) => r.user_id))];
        let people: Record<string, OptedRep> = {};
        if (ids.length) {
          const { data: p } = await (supabase as any)
            .from('profiles')
            .select('user_id, full_name, phone')
            .in('user_id', ids);
          for (const row of (p as OptedRep[]) || []) people[row.user_id] = row;
        }
        for (const r of rows) {
          rosterMap[r.blitz_key] = rosterMap[r.blitz_key] || [];
          rosterMap[r.blitz_key].push(
            people[r.user_id] || { user_id: r.user_id, full_name: null, phone: null }
          );
        }
      }
      setRoster(rosterMap);
    }
    setLoading(false);
  }, [user, isLead, keySig]);

  useEffect(() => {
    void load();
  }, [load]);

  const optIn = useCallback(
    async (blitzKey: string) => {
      if (!user) return false;
      const { error } = await (supabase as any)
        .from('blitz_optins')
        .insert({ blitz_key: blitzKey, user_id: user.id });
      if (!error) await load();
      return !error;
    },
    [user, load]
  );

  const optOut = useCallback(
    async (blitzKey: string) => {
      if (!user) return false;
      const { error } = await (supabase as any)
        .from('blitz_optins')
        .delete()
        .eq('blitz_key', blitzKey)
        .eq('user_id', user.id);
      if (!error) await load();
      return !error;
    },
    [user, load]
  );

  return { loading, eligible, isLead, counts, roster, optIn, optOut, reload: load };
}
