import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pass 140 — real rank names for a set of people, straight from profiles and
 * ranks. Anyone without a rank row is simply absent from the map, so callers
 * render no mark rather than a placeholder.
 */
export function useRankLabels(userIds: string[]): Record<string, string> {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const key = userIds.slice().sort().join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) {
      setLabels({});
      return;
    }
    let alive = true;
    (async () => {
      const [profileRes, rankRes] = await Promise.all([
        (supabase as any).from('profiles').select('user_id, rank_id').in('user_id', ids),
        (supabase as any).from('ranks').select('id, name'),
      ]);
      if (!alive) return;
      const rankNames = new Map<string, string>(
        (((rankRes.data as { id: string; name: string }[]) || []).map((r) => [r.id, r.name]) as [string, string][])
      );
      const next: Record<string, string> = {};
      (((profileRes.data as { user_id: string; rank_id: string | null }[]) || []) as {
        user_id: string;
        rank_id: string | null;
      }[]).forEach((p) => {
        const name = p.rank_id ? rankNames.get(p.rank_id) : null;
        if (name) next[p.user_id] = name;
      });
      setLabels(next);
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  return labels;
}

export default useRankLabels;
