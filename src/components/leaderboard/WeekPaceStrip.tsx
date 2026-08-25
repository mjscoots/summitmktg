import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Trophy, PhoneCall, Timer } from 'lucide-react';

interface Leader {
  user_id: string;
  name: string;
  value: number;
}

interface Pace {
  most_signs?: Leader;
  most_worked?: Leader;
  fastest_sign?: Leader;
}

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

export function WeekPaceStrip() {
  const [pace, setPace] = useState<Pace | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Lazy sweep: posts last week's awards once if the Sunday cutoff has passed
      await (supabase as any).rpc('post_weekly_awards');
      const { data } = await (supabase as any).rpc('get_week_pace');
      if (!cancelled) setPace((data as Pace) || {});
    })();
    return () => { cancelled = true; };
  }, []);

  if (!pace) return null;

  const items = [
    pace.most_signs && { icon: Trophy, label: 'Most Signs', name: pace.most_signs.name, value: `${pace.most_signs.value}` },
    pace.most_worked && { icon: PhoneCall, label: 'Most Leads Worked', name: pace.most_worked.name, value: `${pace.most_worked.value}` },
    pace.fastest_sign && { icon: Timer, label: 'Fastest Claim-to-Sign', name: pace.fastest_sign.name, value: `${pace.fastest_sign.value}h` },
  ].filter(Boolean) as { icon: typeof Trophy; label: string; name: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div className={cn(CARD, 'mb-5 p-4')}>
      <p className="micro-label mb-3">This week&rsquo;s pace</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
            <it.icon className="h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{it.label}</p>
              <p className="truncate text-[13px] font-semibold text-foreground">
                {it.name} <span className="tabular-nums text-amber-400">{it.value}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
