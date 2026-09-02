import { LockedInBadge } from '@/components/badges/LockedInBadge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Row {
  user_id: string;
  full_name: string | null;
  installs: number;
  rank: number;
}

/**
 * Leaderboard for a non-pest workspace. Fiber ranks on installs; workspaces
 * without a production metric yet show no data.
 */
export function WorkspaceLeaderboard({ vertical, unit }: { vertical: string; unit: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(vertical === 'Fiber');

  useEffect(() => {
    if (vertical !== 'Fiber') return;
    (async () => {
      const { data } = await (supabase as any).rpc('get_fiber_leaderboard', { p_week_start: null });
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [vertical]);

  if (vertical !== 'Fiber') {
    return <p className="p-6 text-sm text-muted-foreground">No data yet.</p>;
  }

  if (loading) {
    return (
      <div className="p-6 space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No {unit} recorded yet.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th className="px-4 py-2">#</th>
          <th className="px-4 py-2">Rep</th>
          <th className="px-4 py-2 text-right">{unit}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.user_id} className="border-t border-border/40">
            <td className="px-4 py-2 tabular-nums">{r.rank}</td>
            <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5">{r.full_name || 'Unnamed'}<LockedInBadge userId={r.user_id} /></span></td>
            <td className="px-4 py-2 text-right tabular-nums">{r.installs}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
