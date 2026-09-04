import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** One confirmed pay row for the caller's own tier. */
export interface CompLadderRow {
  label: string | null;
  threshold: string | null;
  unit: string | null;
  value: number | null;
  rate: number | null;
  carrier: string | null;
  leader: boolean;
  sort_order: number | null;
}

export interface CompLadder {
  tier_label: string | null;
  can_see_leaders: boolean;
  vertical?: string | null;
  rows: CompLadderRow[];
}

export const EMPTY_LADDER: CompLadder = {
  tier_label: null,
  can_see_leaders: false,
  rows: [],
};

/** Read the caller's confirmed pay rows from the server. Never a constant. */
export async function fetchCompLadder(vertical?: string | null): Promise<CompLadder> {
  const { data } = await (supabase as any).rpc('my_comp_ladder', { _vertical: vertical ?? null });
  const res = (data as CompLadder | null) ?? null;
  if (!res) return EMPTY_LADDER;
  return { ...EMPTY_LADDER, ...res, rows: Array.isArray(res.rows) ? res.rows : [] };
}

/** The caller's own rate, from the highest confirmed rate row that is not a leader row. */
export function repRate(ladder: CompLadder | null): number | null {
  const rows = (ladder?.rows ?? []).filter((r) => !r.leader && r.rate !== null);
  if (rows.length === 0) return null;
  return Number(rows[rows.length - 1].rate);
}

/** The leader (marketing deal) rate, only ever present when the server returned leader rows. */
export function leaderRate(ladder: CompLadder | null): number | null {
  const rows = (ladder?.rows ?? []).filter((r) => r.leader && r.rate !== null);
  if (rows.length === 0) return null;
  return Number(rows[rows.length - 1].rate);
}

export function useCompLadder(vertical?: string | null) {
  const [ladder, setLadder] = useState<CompLadder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const res = await fetchCompLadder(vertical);
      if (!active) return;
      setLadder(res);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [vertical]);

  return { ladder, loading };
}
