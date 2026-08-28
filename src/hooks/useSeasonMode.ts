import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SeasonMode = 'in' | 'off';

/**
 * Pass 97 — one setting decides the season. No date math: the owner flips it in
 * Admin → Settings → Season, and Home leads with the number that matters now.
 * Off season is the default, which is the truth today.
 */
export function useSeasonMode() {
  const [mode, setMode] = useState<SeasonMode>('off');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'season_mode')
        .maybeSingle();
      if (!alive) return;
      setMode((data as { value: string | null } | null)?.value === 'in' ? 'in' : 'off');
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { mode, offSeason: mode === 'off', loading };
}

export interface ResignHero {
  signed: number;
  /** People actually on the roster: historical names are not in this total. */
  rosterTotal: number;
  signedRevenue: number;
  unsigned: number;
  unsignedRevenue: number;
  loading: boolean;
}

/** The staff off-season number: how many are signed for 2027, and what is left. */
export function useResignHero(enabled: boolean): ResignHero {
  const [state, setState] = useState<ResignHero>({
    signed: 0,
    rosterTotal: 0,
    signedRevenue: 0,
    unsigned: 0,
    unsignedRevenue: 0,
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('leads_counts');
      if (!alive) return;
      const c = (data as Record<string, number>) || {};
      setState({
        signed: Number(c.signed_count || 0),
        rosterTotal: Number(c.roster_total || 0),
        signedRevenue: Number(c.signed_revenue || 0),
        unsigned: Number(c.unsigned_count || 0),
        unsignedRevenue: Number(c.unsigned_revenue || 0),
        loading: false,
      });
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return state;
}

/** The rep off-season line: their season goal and their login streak. */
export function useRepOffSeasonLine(enabled: boolean) {
  const { user, profile } = useAuth();
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    if (!enabled || !user?.id) return;
    const { data } = await supabase
      .from('daily_login_streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .maybeSingle();
    setStreak((data as { current_streak: number } | null)?.current_streak ?? 0);
  }, [enabled, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const goal = Number((profile as { revenue_goal?: number | null } | null)?.revenue_goal || 0);
  return { streak, goal };
}
