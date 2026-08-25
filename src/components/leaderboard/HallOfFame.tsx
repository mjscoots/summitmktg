import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Trophy, Target } from 'lucide-react';
import { format } from 'date-fns';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface HofRow {
  season_id: string;
  season_name: string;
  starts_on: string;
  ends_on: string;
  metric: 'points' | 'signs';
  rank: number;
  value: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const MEDAL = ['text-[#D4AF37]', 'text-muted-foreground', 'text-amber-700'];

/** Past seasons' frozen top 3 by points and by signs. */
export function HallOfFame() {
  const [rows, setRows] = useState<HofRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc('get_hall_of_fame');
      if (!cancelled) setRows((data as HofRow[]) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!rows) return <div className="p-6 text-center text-[13px] text-muted-foreground">Loading…</div>;
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center">
        <Trophy className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-[13px] text-muted-foreground">No completed seasons yet.</p>
      </div>
    );
  }

  const seasons = Array.from(new Set(rows.map((r) => r.season_id)));

  return (
    <div className="divide-y divide-border/40">
      {seasons.map((sid) => {
        const seasonRows = rows.filter((r) => r.season_id === sid);
        const s = seasonRows[0];
        return (
          <div key={sid} className="p-4">
            <div className="mb-3">
              <h3 className="text-[13px] font-bold text-foreground">{s.season_name}</h3>
              <p className="text-[11px] text-muted-foreground">
                {format(new Date(`${s.starts_on}T12:00:00`), 'MMM d, yyyy')} – {format(new Date(`${s.ends_on}T12:00:00`), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['points', 'signs'] as const).map((metric) => {
                const list = seasonRows.filter((r) => r.metric === metric).sort((a, b) => a.rank - b.rank);
                if (!list.length) return null;
                const Icon = metric === 'points' ? Trophy : Target;
                return (
                  <div key={metric}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-micro text-muted-foreground">
                        Top {metric}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {list.map((r) => (
                        <div key={r.rank} className="flex items-center gap-2 min-w-0">
                          <span className={cn('w-4 text-[12px] font-bold shrink-0', MEDAL[r.rank - 1] || 'text-muted-foreground')}>
                            {r.rank}
                          </span>
                          <UserAvatar avatarUrl={r.avatar_url} fullName={r.full_name || 'Rep'} size="sm" />
                          <span className="text-[12px] text-foreground truncate flex-1">{r.full_name || 'Rep'}</span>
                          <span className="text-[11px] font-bold text-primary tabular-nums shrink-0">
                            {r.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
