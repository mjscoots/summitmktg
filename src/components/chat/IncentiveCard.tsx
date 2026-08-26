import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface IncentiveCardMeta {
  name?: string;
  metric?: string | null;
  target?: number | null;
  ends_on?: string | null;
  prize_note?: string | null;
}

interface ProgressRow {
  id: string;
  name: string;
  metric: string | null;
  target: number | null;
  ends_on: string | null;
  prize_note: string | null;
  my_value: number | null;
}

export function IncentiveCard({ incentiveId, meta, title }: { incentiveId: string | null; meta: IncentiveCardMeta | null; title: string }) {
  const [row, setRow] = useState<ProgressRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc('get_incentive_progress');
      if (cancelled) return;
      const list = (data as ProgressRow[]) || [];
      setRow(list.find((r) => r.id === incentiveId) ?? null);
    })();
    return () => { cancelled = true; };
  }, [incentiveId]);

  const target = row?.target ?? meta?.target ?? null;
  const value = row?.my_value ?? null;
  const pct = target && target > 0 && value != null ? Math.min(100, Math.round((value / target) * 100)) : null;
  const endsOn = row?.ends_on ?? meta?.ends_on ?? null;

  return (
    <div className="my-3 px-3">
      <div className="mx-auto max-w-md rounded-xl border border-border/60 bg-card p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Incentive</span>
        <p className="mt-1 text-[15px] font-semibold text-foreground">{row?.name || meta?.name || title}</p>
        {(row?.prize_note || meta?.prize_note) && (
          <p className="mt-1 text-[13px] text-muted-foreground">{row?.prize_note || meta?.prize_note}</p>
        )}

        {pct != null && (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[12px] tabular-nums text-muted-foreground">
              {value} of {target}
            </p>
          </div>
        )}

        {endsOn && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Ends {format(new Date(endsOn), 'MMM d, yyyy')}
          </p>
        )}
      </div>
    </div>
  );
}
