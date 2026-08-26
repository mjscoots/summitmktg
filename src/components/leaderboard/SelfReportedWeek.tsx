import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface RepRow {
  user_id: string;
  full_name: string | null;
  team_name: string | null;
  sales: number;
  revenue: number;
  rank: number;
}

interface TeamRow {
  team_id: string;
  team_name: string | null;
  sales: number;
  revenue: number;
  rank: number;
}

/**
 * This week's standings from what reps logged themselves. Ranked on sale
 * count, ties broken by the earliest sale of the week.
 */
export function SelfReportedWeek() {
  const { user } = useAuth();
  const [view, setView] = useState<'reps' | 'teams'>('reps');
  const [reps, setReps] = useState<RepRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, t] = await Promise.all([
        (supabase.rpc as any)('get_self_reported_week', { p_week_start: null }),
        (supabase.rpc as any)('get_self_reported_week_teams', { p_week_start: null }),
      ]);
      setReps((r.data as RepRow[]) || []);
      setTeams((t.data as TeamRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const rows = view === 'reps' ? reps : teams;

  return (
    <div className="p-4">
      <p className="text-[13px] text-muted-foreground">Self-reported, reconciled monthly</p>

      <div className="mt-3 flex gap-2">
        {(['reps', 'teams'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'min-h-11 rounded-[var(--radius)] border px-4 text-[13px] font-semibold',
              view === v
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border/40 bg-card text-muted-foreground'
            )}
          >
            {v === 'reps' ? 'Reps' : 'Teams'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">No sales logged this week.</p>
      ) : (
        <table className="mt-4 w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">{view === 'reps' ? 'Rep' : 'Team'}</th>
              <th className="py-2 pr-2 text-right">Sales</th>
              <th className="py-2 text-right">Initial</th>
            </tr>
          </thead>
          <tbody>
            {view === 'reps'
              ? reps.map((r) => (
                  <tr
                    key={r.user_id}
                    className={cn('border-t border-border/40', r.user_id === user?.id && 'font-semibold')}
                  >
                    <td className="py-2 pr-2 tabular-nums">{r.rank}</td>
                    <td className="py-2 pr-2">
                      {r.full_name || 'Rep'}
                      {r.team_name ? <span className="text-muted-foreground"> · {r.team_name}</span> : null}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-accent-number">{r.sales}</td>
                    <td className="py-2 text-right tabular-nums">
                      ${Math.round(Number(r.revenue || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))
              : teams.map((t) => (
                  <tr key={t.team_id} className="border-t border-border/40">
                    <td className="py-2 pr-2 tabular-nums">{t.rank}</td>
                    <td className="py-2 pr-2">{t.team_name || 'Team'}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-accent-number">{t.sales}</td>
                    <td className="py-2 text-right tabular-nums">
                      ${Math.round(Number(t.revenue || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SelfReportedWeek;
