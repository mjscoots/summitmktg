import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WeekRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  team_name: string | null;
  vertical: string | null;
  last_active_at: string | null;
  sales_week: number;
  sales_4w: number[];
  training_week: number;
  training_prev: number;
  open_rsvps: number;
  late_rsvps: number;
  summary_line: string | null;
  concerns: string[];
  goals: string | null;
  profile_built_at: string | null;
  setup_step: string | null;
  needs_attention: boolean;
}

export interface WeekTotals {
  sales: number;
  training: number;
  openRsvps: number;
  attention: number;
  reps: number;
}

interface WeekPayload {
  scope: 'all' | 'vertical' | 'downline' | 'none';
  week_start: string | null;
  last_opened_at: string | null;
  rows: WeekRow[];
}

/** Reasons a row is flagged. Mirrors the server rule, for display only. */
export function attentionReasons(r: WeekRow, lastOpened: string | null): string[] {
  const out: string[] = [];
  if (r.sales_week === 0 && r.training_week === 0) out.push('No sales and no training this week');
  const days = r.last_active_at
    ? Math.floor((Date.now() - new Date(r.last_active_at).getTime()) / 86400000)
    : null;
  if (days === null) out.push('Never opened the app');
  else if (days >= 3) out.push(`No app open in ${days} days`);
  if (r.late_rsvps > 0) out.push('Event answer past its deadline');
  if (
    lastOpened &&
    r.profile_built_at &&
    new Date(r.profile_built_at) > new Date(lastOpened) &&
    r.concerns.length > 0
  ) {
    out.push('New note from Summit says');
  }
  return out;
}

/** One row per rep in the caller's scope, with this week's numbers. */
export function useManagerWeek() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<WeekPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPayload(null);
      setLoading(false);
      return;
    }
    const { data, error } = await (supabase as any).rpc('get_manager_week');
    if (error || !data) {
      setPayload(null);
      setLoading(false);
      return;
    }
    const raw = data as WeekPayload;
    setPayload({
      ...raw,
      rows: (raw.rows || []).map((r) => ({
        ...r,
        sales_4w: Array.isArray(r.sales_4w) ? r.sales_4w : [],
        concerns: Array.isArray(r.concerns) ? (r.concerns as unknown[]).map(String) : [],
      })),
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markOpened = useCallback(async () => {
    if (!user) return;
    await (supabase as any).rpc('mark_week_opened');
  }, [user]);

  const rows = payload?.rows || [];

  const totals: WeekTotals = useMemo(
    () => ({
      sales: rows.reduce((a, r) => a + r.sales_week, 0),
      training: rows.reduce((a, r) => a + r.training_week, 0),
      openRsvps: rows.reduce((a, r) => a + r.open_rsvps, 0),
      attention: rows.filter((r) => r.needs_attention).length,
      reps: rows.length,
    }),
    [rows]
  );

  return {
    rows,
    totals,
    scope: payload?.scope || 'none',
    lastOpenedAt: payload?.last_opened_at || null,
    weekStart: payload?.week_start || null,
    loading,
    refresh,
    markOpened,
  };
}
