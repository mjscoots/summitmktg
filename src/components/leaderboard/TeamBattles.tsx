import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Swords } from 'lucide-react';

export interface TeamBattleRow {
  team_id: string;
  team_name: string;
  member_count: number;
  total_points: number;
  rank: number;
}

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

export function useTeamBattles() {
  const [rows, setRows] = useState<TeamBattleRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc('get_team_battles');
      if (!cancelled) setRows(((data as TeamBattleRow[]) || []).filter((r) => r.member_count > 0));
    })();
    return () => { cancelled = true; };
  }, []);

  return rows;
}

/** Weekly team-vs-team points banner. */
export function TeamBattles() {
  const rows = useTeamBattles();
  if (!rows || rows.length < 2) return null;

  const top = rows[0].total_points || 1;

  return (
    <div className={cn(CARD, 'p-4 mb-4')}>
      <div className="flex items-center gap-2 mb-3">
        <Swords className="w-4 h-4 text-primary" />
        <h2 className="text-[11px] font-bold uppercase tracking-micro text-muted-foreground">
          Team Battle · This Week
        </h2>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.team_id} className="flex items-center gap-3">
            <span className="w-5 text-[11px] font-bold text-muted-foreground shrink-0">{r.rank}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[13px] font-semibold text-foreground truncate">{r.team_name}</span>
                <span className="text-[11px] font-bold text-primary shrink-0 tabular-nums">
                  {r.total_points.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', r.rank === 1 ? 'bg-[#D4AF37]' : 'bg-primary/60')}
                  style={{ width: `${Math.max(2, Math.round((r.total_points / top) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small home strip: where your team stands this week. */
export function TeamBattleStrip({ teamId }: { teamId?: string | null }) {
  const rows = useTeamBattles();
  if (!rows || rows.length < 2 || !teamId) return null;
  const mine = rows.find((r) => r.team_id === teamId);
  if (!mine) return null;
  const leader = rows[0];
  const behind = leader.total_points - mine.total_points;

  return (
    <div className={cn(CARD, 'flex items-center gap-2 px-3 py-2')}>
      <Swords className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="text-[12px] text-muted-foreground truncate">
        <span className="font-semibold text-foreground">{mine.team_name}</span> is #{mine.rank} this week
        {behind > 0 ? ` · ${behind.toLocaleString()} pts behind ${leader.team_name}` : ' · leading'}
      </span>
    </div>
  );
}
