import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Target, Gift } from 'lucide-react';
import { format } from 'date-fns';

interface IncentiveRow {
  id: string;
  name: string;
  metric: 'signs' | 'points';
  target: number;
  ends_on: string | null;
  prize_note: string | null;
  my_value: number;
}

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

/** Active incentives as personal progress bars. Hidden when none are configured. */
export function IncentiveTracker() {
  const [rows, setRows] = useState<IncentiveRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc('get_incentive_progress');
      if (!cancelled) setRows((data as IncentiveRow[]) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!rows || rows.length === 0) return null;

  return (
    <div className={cn(CARD, 'p-4 mb-4')}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-primary" />
        <h2 className="text-[11px] font-bold uppercase tracking-micro text-muted-foreground">Incentives</h2>
      </div>
      <div className="space-y-3">
        {rows.map((i) => {
          const pct = Math.min(100, Math.round((i.my_value / i.target) * 100));
          const done = i.my_value >= i.target;
          return (
            <div key={i.id}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[13px] font-semibold text-foreground truncate">{i.name}</span>
                <span className={cn('text-[11px] font-bold tabular-nums shrink-0', done ? 'text-success' : 'text-primary')}>
                  {i.my_value.toLocaleString()}/{i.target.toLocaleString()} {i.metric}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', done ? 'bg-success' : 'bg-primary')}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                {i.prize_note && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#D4AF37]">
                    <Gift className="w-3 h-3" /> {i.prize_note}
                  </span>
                )}
                {i.ends_on && (
                  <span className="text-[11px] text-muted-foreground">
                    Ends {format(new Date(`${i.ends_on}T12:00:00`), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
