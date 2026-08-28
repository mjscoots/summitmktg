import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecruitRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  pct: number;
  done: number;
  total: number;
  minutes: number;
  last_active_at: string | null;
}

function lastActive(iso: string | null): string {
  if (!iso) return 'Not signed in yet';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `Active ${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `Active ${Math.round(mins / 60)}h ago`;
  return `Active ${Math.round(mins / 1440)}d ago`;
}

/**
 * Pass 119 — recruits still in the day-one watch course. Managers see their
 * own, owner and admin see all. Counts and nouns only.
 */
export function GatedRecruitsPanel() {
  const [rows, setRows] = useState<RecruitRow[]>([]);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('gated_recruits');
    setRows((data || []) as RecruitRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!rows.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] uppercase tracking-widest text-[hsl(var(--workspace-accent))]">Recruits</h2>
        <span className="text-xs text-muted-foreground">{rows.length} in the watch course</span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.user_id} className="rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-foreground">{r.full_name || 'New recruit'}</span>
              <span className="shrink-0 text-sm text-foreground">{r.pct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--workspace-accent))] to-primary"
                style={{ width: `${Math.min(Math.max(r.pct, 0), 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {r.done} of {r.total} watched · {r.minutes} minutes · {lastActive(r.last_active_at)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
