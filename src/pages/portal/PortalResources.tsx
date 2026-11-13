import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAsync } from './useAsync';

type Row = { user_id: string; name: string; sales?: number; week?: number; all?: number };
type R = { user_id: string; full_name: string | null; nickname?: string | null };

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T[] | null> {
  try {
    const { data, error } = await (supabase.rpc as any)(fn, args);
    return error || !Array.isArray(data) ? null : (data as T[]);
  } catch { return null; }
}

export default function PortalResources() {
  const { data, isLoading } = useAsync(async () => {
    const [sales, week, all, fiber] = await Promise.all([
      call<R & { sales: number }>('get_self_reported_week', { p_week_start: null }),
      call<R & { total_points: number }>('get_current_leaderboard'),
      call<R & { total_points: number }>('get_all_time_leaderboard', { _limit: 50 }),
      call<R & { installs: number }>('get_fiber_leaderboard', { p_week_start: null }),
    ]);
    const map = new Map<string, Row>();
    const get = (r: R) => {
      let x = map.get(r.user_id);
      if (!x) { x = { user_id: r.user_id, name: r.full_name || r.nickname || 'Name not on file' }; map.set(r.user_id, x); }
      return x;
    };
    for (const r of sales ?? []) get(r).sales = Number(r.sales);
    for (const r of week ?? []) get(r).week = Number(r.total_points);
    for (const r of all ?? []) get(r).all = Number(r.total_points);
    const rows = [...map.values()].sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0) || (b.week ?? 0) - (a.week ?? 0) || (b.all ?? 0) - (a.all ?? 0));
    const allFailed = !sales && !week && !all && !fiber;
    return { rows, fiber: (fiber ?? []).map((r) => ({ id: r.user_id, name: r.full_name || 'Name not on file', installs: Number(r.installs) })), allFailed };
  }, []);

  const n = (v?: number) => (v == null ? '—' : v.toLocaleString());

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Resources</h1>
      <p className="text-sm text-muted-foreground">
        Source: same data as /app/leaderboard. Sales counts from sales_log via get_self_reported_week (Pest, this week Mon–Sun, America/Los_Angeles). Points from get_current_leaderboard (this week) and get_all_time_leaderboard (all-time). Amounts and pay are not shown.
      </p>
      {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : data?.allFailed || (!data?.rows.length && !data?.fiber.length) ? (
        <p className="text-muted-foreground">Production numbers coming soon</p>
      ) : (
        <>
          {data!.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr><th className="p-2">Name</th><th className="p-2 text-right">Sales this week</th><th className="p-2 text-right">Points this week</th><th className="p-2 text-right">Points all-time</th></tr>
                </thead>
                <tbody>
                  {data!.rows.map((r) => (
                    <tr key={r.user_id} className="border-t border-border">
                      <td className="p-2">{r.name}</td><td className="p-2 text-right">{n(r.sales)}</td><td className="p-2 text-right">{n(r.week)}</td><td className="p-2 text-right">{n(r.all)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data!.fiber.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-semibold">Fiber installs this week</h2>
              <p className="text-sm text-muted-foreground">Source: get_fiber_leaderboard (this week).</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left"><tr><th className="p-2">Name</th><th className="p-2 text-right">Installs</th></tr></thead>
                  <tbody>{data!.fiber.map((r) => <tr key={r.id} className="border-t border-border"><td className="p-2">{r.name}</td><td className="p-2 text-right">{n(r.installs)}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
