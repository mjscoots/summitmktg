import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CalendarX, FileQuestion, HelpCircle } from 'lucide-react';

interface Gaps {
  no_committed_last_day: number;
  no_departure_reason: number;
  no_next_season_status: number;
  total: number;
}

const CARD = 'rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

/**
 * Three roster gap counters. Each one opens the roster sweep pre-filtered to
 * that gap. Scope comes from the RPC: admins/owner see everyone, managers see
 * their own tree.
 */
export function RosterGapCounters({ className }: { className?: string }) {
  const [gaps, setGaps] = useState<Gaps | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_roster_gaps');
      if (cancelled) return;
      if (!error && data && !data.error) setGaps(data as Gaps);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !gaps) return null;

  const items = [
    { key: 'last_day', label: 'No committed last day', value: gaps.no_committed_last_day, icon: CalendarX },
    { key: 'reason', label: 'No departure reason', value: gaps.no_departure_reason, icon: FileQuestion },
    { key: 'status', label: 'No next-season status', value: gaps.no_next_season_status, icon: HelpCircle },
  ];

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
      {items.map(({ key, label, value, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => navigate(`/app/roster/sweep?gap=${key}`)}
          className={cn(CARD, 'min-h-[88px] p-4 text-left transition-colors hover:border-primary/30')}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-primary" />
            <span className="micro-label">{label}</span>
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">{value}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Tap to sweep these</p>
        </button>
      ))}
    </div>
  );
}

export default RosterGapCounters;
