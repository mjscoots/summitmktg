import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FirstWeekItem {
  key: string;
  label: string;
  rule?: string;
  mark?: string | null;
  link?: string | null;
  done: boolean;
}

export interface FirstWeekDay {
  day: number;
  title: string;
  items: FirstWeekItem[];
  complete: boolean;
}

export interface FirstWeek {
  found: boolean;
  vertical: string | null;
  start_date: string | null;
  day_number: number;
  days: FirstWeekDay[];
  total: number;
  done: number;
  complete: boolean;
  behind_days: number;
}

const EMPTY: FirstWeek = {
  found: false,
  vertical: null,
  start_date: null,
  day_number: 1,
  days: [],
  total: 0,
  done: 0,
  complete: false,
  behind_days: 0,
};

function normalize(raw: unknown): FirstWeek {
  const d = (raw || {}) as Partial<FirstWeek>;
  if (!d.found) return EMPTY;
  return {
    found: true,
    vertical: d.vertical ?? null,
    start_date: d.start_date ?? null,
    day_number: Number(d.day_number ?? 1),
    days: Array.isArray(d.days) ? d.days : [],
    total: Number(d.total ?? 0),
    done: Number(d.done ?? 0),
    complete: Boolean(d.complete),
    behind_days: Number(d.behind_days ?? 0),
  };
}

/** The seven day first week plan for one person, with each item's state. */
export function useFirstWeek(targetUserId?: string) {
  const { user } = useAuth();
  const [week, setWeek] = useState<FirstWeek>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setWeek(EMPTY);
      setLoading(false);
      return;
    }
    const { data, error } = await (supabase as any).rpc('get_first_week', {
      _target: targetUserId ?? null,
    });
    setWeek(error ? EMPTY : normalize(data));
    setLoading(false);
  }, [user, targetUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mark = useCallback(
    async (day: number, key: string, on: boolean) => {
      const who = targetUserId ?? user?.id;
      if (!who) return;
      const { data, error } = await (supabase as any).rpc('mark_first_week_item', {
        _user: who,
        _day: day,
        _key: key,
        _on: on,
      });
      if (!error && data) setWeek(normalize(data));
    },
    [targetUserId, user]
  );

  return { week, loading, refresh, mark };
}

/** First week rows for every rookie in the caller's scope. */
export function useFirstWeekRows() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, FirstWeek>>({});

  const refresh = useCallback(async () => {
    if (!user) {
      setRows({});
      return;
    }
    const { data, error } = await (supabase as any).rpc('get_first_week_rows');
    if (error || !Array.isArray(data)) {
      setRows({});
      return;
    }
    const map: Record<string, FirstWeek> = {};
    (data as { user_id: string; week: unknown }[]).forEach((r) => {
      const w = normalize(r.week);
      if (w.found) map[r.user_id] = w;
    });
    setRows(map);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mark = useCallback(
    async (userId: string, day: number, key: string, on: boolean) => {
      await (supabase as any).rpc('mark_first_week_item', {
        _user: userId,
        _day: day,
        _key: key,
        _on: on,
      });
      await refresh();
    },
    [refresh]
  );

  return { rows, refresh, mark };
}
