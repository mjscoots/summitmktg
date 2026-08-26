import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TopRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  count: number;
}

export interface HomeToday {
  /** The caller's own sales logged today. */
  today: number;
  /** Mon–Sun counts of the caller's own sales for the current week. */
  weekBars: number[];
  /** The caller's own training minutes this week. */
  trainingMinutes: number;
  /** Sales logged today by everyone the caller is allowed to see. */
  visibleToday: number;
  /** Today's leaders among the people the caller can see. */
  topToday: TopRow[];
  /** Sales per day for the last fourteen days across visible people. */
  sparkline: number[];
  loading: boolean;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function mondayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * Today's numbers for Home, read straight from sales_log. Row level security
 * decides which people the caller can see, so a rep only ever sees their own
 * rows and a manager sees the people they are allowed to see.
 */
export function useHomeToday(): HomeToday & { refresh: () => Promise<void> } {
  const { user } = useAuth();
  const [state, setState] = useState<HomeToday>({
    today: 0,
    weekBars: [0, 0, 0, 0, 0, 0, 0],
    trainingMinutes: 0,
    visibleToday: 0,
    topToday: [],
    sparkline: Array.from({ length: 14 }, () => 0),
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    const monday = mondayLocal();
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 13);
    const windowStart = monday < since ? monday : since;

    const [salesRes, timeRes] = await Promise.all([
      (supabase as any)
        .from('sales_log')
        .select('user_id, sold_at')
        .gte('sold_at', windowStart.toISOString()),
      supabase
        .from('daily_training_time')
        .select('training_minutes')
        .eq('user_id', user.id)
        .gte('date', monday.toISOString().slice(0, 10)),
    ]);

    const rows = (salesRes.data as { user_id: string; sold_at: string }[] | null) || [];
    const todayK = dayKey(new Date());

    const weekBars = [0, 0, 0, 0, 0, 0, 0];
    let today = 0;
    let visibleToday = 0;
    const byPerson = new Map<string, number>();
    const sparkline = Array.from({ length: 14 }, () => 0);

    for (const r of rows) {
      const d = new Date(r.sold_at);
      const k = dayKey(d);
      const mine = r.user_id === user.id;

      if (mine && d >= monday) {
        const idx = (d.getDay() + 6) % 7;
        weekBars[idx] += 1;
      }
      if (k === todayK) {
        visibleToday += 1;
        if (mine) today += 1;
        byPerson.set(r.user_id, (byPerson.get(r.user_id) || 0) + 1);
      }
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const offset = Math.round((dayStart.getTime() - since.getTime()) / 86_400_000);
      if (offset >= 0 && offset < 14) sparkline[offset] += 1;
    }

    let topToday: TopRow[] = [];
    const ids = [...byPerson.keys()];
    if (ids.length > 0) {
      const { data: people } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, nickname, avatar_url')
        .in('user_id', ids);
      const map = new Map(
        (((people as { user_id: string; full_name: string | null; nickname: string | null; avatar_url: string | null }[]) || [])).map(
          (p) => [p.user_id, p]
        )
      );
      topToday = ids
        .map((id) => {
          const p = map.get(id);
          return {
            user_id: id,
            name: p?.nickname || p?.full_name || 'Rep',
            avatar_url: p?.avatar_url || null,
            count: byPerson.get(id) || 0,
          };
        })
        .sort((a, b) => b.count - a.count);
    }

    setState({
      today,
      weekBars,
      trainingMinutes: (((timeRes.data as { training_minutes: number | null }[]) || [])).reduce(
        (a, r) => a + (r.training_minutes || 0),
        0
      ),
      visibleToday,
      topToday,
      sparkline,
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
