import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ChevronRight, Loader2, Users } from 'lucide-react';
import { LeaderScorecard } from '@/components/shared/LeaderScorecard';
import { Link } from 'react-router-dom';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

interface Leader {
  user_id: string;
  name: string | null;
  office: string | null;
  vertical: string | null;
  tree_size: number;
}

export default function LeadersSection() {
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [underLed, setUnderLed] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: list }, { data: ul }] = await Promise.all([
        (supabase as any).rpc('get_leaders_list', {}),
        (supabase as any).rpc('get_under_led', {}),
      ]);
      setLeaders(list?.error ? [] : ((list?.leaders ?? []) as Leader[]));
      setUnderLed(ul?.error ? null : Number(ul?.not_in_outreach ?? 0));
    })();
  }, []);

  return (
    <div className="space-y-3">
      <div className={cn(CARD, 'flex flex-wrap items-center justify-between gap-3 p-4')}>
        <div>
          <p className="text-sm font-semibold text-foreground">Leaders</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Data-owned scorecard for every leader with a tree.
          </p>
        </div>
        <Link
          to="/app/recruits?tab=winback&view=under-led"
          className="text-xs text-primary hover:underline tabular-nums"
        >
          Under-led not in outreach: {underLed == null ? 'No data yet' : underLed}
        </Link>
      </div>

      {leaders === null ? (
        <p className="text-xs text-muted-foreground">
          <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Loading leaders…
        </p>
      ) : leaders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet</p>
      ) : (
        <div className="space-y-2">
          {leaders.map((l) => (
            <div key={l.user_id} className={cn(CARD, 'overflow-hidden')}>
              <button
                onClick={() => setSelected((p) => (p === l.user_id ? null : l.user_id))}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <Users className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{l.name || 'Unnamed'}</span>
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    {l.office || 'No office set'}
                    {l.vertical ? ` · ${l.vertical}` : ''} · {l.tree_size} direct
                  </span>
                </span>
                <ChevronRight
                  className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', selected === l.user_id && 'rotate-90')}
                />
              </button>
              {selected === l.user_id && (
                <div className="border-t border-white/[0.06] p-4">
                  <LeaderScorecard userId={l.user_id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
