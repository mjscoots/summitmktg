import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';


interface StackRow {
  carrier_id: string;
  carrier_name: string;
  vertical: string;
  rank_name: string | null;
  stack_value: number | null;
  stack_unit: string | null;
}

/** Confirmed values only. An unconfirmed stack shows the rank name alone. */
export function stackLine(row: StackRow): string {
  const rank = row.rank_name || 'No rank yet';
  if (row.stack_value == null) return rank;
  return `${rank} · $${Math.round(row.stack_value).toLocaleString()}`;
}

/** Quiet card on My money: what the rep is stacked at, carrier by carrier. */
export function YourStacksCard() {
  const { user, isLoading: authLoading } = useAuth();
  const [rows, setRows] = useState<StackRow[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await (supabase as any).rpc('my_stacks', { _vertical: activeVertical });
      setRows(((data as StackRow[]) ?? []).filter((r) => r.rank_name || r.stack_value != null));
    })();
  }, [authLoading, user]);


  if (rows.length === 0) return null;

  return (
    <div className="rounded border border-border bg-card p-3">
      <p className="micro-label">Your stacks</p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.carrier_id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] text-foreground">{r.carrier_name}</span>
            <span className="text-[13px] tabular-nums text-muted-foreground">{stackLine(r)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default YourStacksCard;
