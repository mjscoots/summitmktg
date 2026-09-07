import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface HomeNumber {
  /** The figure for the period this workspace already tracks. */
  value: number;
  /** The label for that figure. */
  label: string;
  /** The season figure, when the workspace tracks one. */
  season: number | null;
  /** The person's own goal from earnings_goals, when they saved one. */
  goal: number | null;
  loading: boolean;
}

/** Monday of this week, in the reader's own timezone. */
function mondayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * The season the app already counts by: it opens on April 1 and runs until the
 * next April 1. Same rule the public counters use.
 */
function seasonStart(): Date {
  const now = new Date();
  let start = new Date(now.getFullYear(), 3, 1);
  if (now < start) start = new Date(now.getFullYear() - 1, 3, 1);
  return start;
}

/**
 * The one number a workspace home opens on. Every figure comes from the table
 * that workspace already reports through, so nothing new is counted here.
 */
export function useHomeNumber(vertical: string): HomeNumber {
  const { user } = useAuth();
  const [state, setState] = useState<HomeNumber>({
    value: 0,
    label: 'This week',
    season: null,
    goal: null,
    loading: true,
  });

  const load = useCallback(async () => {
    if (!user?.id) return;

    const goalRes = await supabase
      .from('earnings_goals')
      .select('goal')
      .eq('user_id', user.id)
      .maybeSingle();
    const rawGoal = goalRes.data?.goal;
    const goal = rawGoal !== null && rawGoal !== undefined && Number(rawGoal) > 0 ? Number(rawGoal) : null;

    if (vertical === 'Fiber') {
      const { data } = await (supabase as any)
        .from('fiber_day_numbers')
        .select('sold, day')
        .eq('user_id', user.id)
        .gte('day', mondayLocal().toISOString().slice(0, 10));
      const week = (((data as { sold: number | null }[]) || [])).reduce((a, r) => a + (r.sold || 0), 0);
      setState({ value: week, label: 'Installs this week', season: null, goal, loading: false });
      return;
    }

    if (vertical === 'Life') {
      const { count } = await (supabase as any)
        .from('life_pipeline')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setState({ value: count || 0, label: 'In your pipeline', season: null, goal, loading: false });
      return;
    }

    // Pest: the same sales_log rows the week leaderboard ranks on.
    const { data } = await (supabase as any)
      .from('sales_log')
      .select('sold_at')
      .eq('user_id', user.id)
      .gte('sold_at', seasonStart().toISOString());
    const rows = (data as { sold_at: string }[] | null) || [];
    const monday = mondayLocal();
    let week = 0;
    for (const r of rows) if (new Date(r.sold_at) >= monday) week += 1;
    setState({
      value: week,
      label: 'Accounts this week',
      season: rows.length,
      goal,
      loading: false,
    });
  }, [user?.id, vertical]);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
