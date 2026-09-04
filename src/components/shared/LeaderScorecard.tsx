import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Copy, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAY_SCALE_LABELS, PayScale, NOT_CONFIRMED } from '@/lib/commission';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

interface Scorecard {
  leader: { name: string | null; office: string | null; vertical: string | null; committed_last_day: string | null; next_year_status: string | null } | null;
  recruited: number;
  showed_up: number;
  active_now: number;
  departed: number;
  departed_fired: number;
  departed_quit: number;
  departed_unknown: number;
  tree_revenue: number | null;
  own_revenue: number | null;
  committed_coverage_pct: number | null;
  committed_missing: number;
  next_season: Record<string, number>;
  error?: string;
}

const money = (n: number | null | undefined) =>
  n == null || Number(n) === 0 ? null : `$${Math.round(Number(n)).toLocaleString()}`;

const NONE = 'No data yet';

export function LeaderScorecard({ userId }: { userId: string }) {
  const [data, setData] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [offices, setOffices] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<{ id: string; name: string }[]>([]);
  const [ladder, setLadder] = useState<{ scale: PayScale; revenue: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: offs }, { data: seas }] = await Promise.all([
        supabase.from('offices').select('name').order('name'),
        supabase.from('seasons').select('id, name').order('starts_on', { ascending: false }),
      ]);
      setOffices(((offs ?? []) as { name: string }[]).map((o) => o.name));
      setSeasons((seas ?? []) as { id: string; name: string }[]);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await (supabase as any).rpc('get_leader_scorecard', {
      _user_id: userId,
      _office: office || null,
      _season_id: seasonId || null,
    });
    setLoading(false);
    if (error || res?.error) {
      toast.error(res?.error || 'Could not load that scorecard');
      setData(null);
      return;
    }
    setData(res as Scorecard);
  }, [userId, office, seasonId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The leader's own position on their pay ladder, from their commission record.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: row } = await supabase
        .from('rep_commission')
        .select('pay_scale, active_revenue, signs, avg_account_value')
        .eq('user_id', userId)
        .maybeSingle();
      if (!active) return;
      const r = row as
        | { pay_scale: string; active_revenue: number | null; signs: number | null; avg_account_value: number | null }
        | null;
      if (!r) {
        setLadder(null);
        return;
      }
      const scale = (['rookie', 'veteran', 'marketing'].includes(r.pay_scale)
        ? r.pay_scale
        : 'rookie') as PayScale;
      const revenue =
        r.active_revenue ??
        (r.avg_account_value != null ? (r.signs ?? 0) * r.avg_account_value : null);
      setLadder(revenue == null ? null : { scale, revenue });
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const pra = (denom: number) =>
    data && data.tree_revenue && denom > 0 ? money(Number(data.tree_revenue) / denom) : null;

  const lines = () => {
    if (!data) return '';
    return [
      `Leader scorecard - ${data.leader?.name ?? NONE}`,
      `Office filter: ${office || 'All offices'}`,
      `Season: ${seasons.find((s) => s.id === seasonId)?.name ?? 'All time'}`,
      `Recruited: ${data.recruited}`,
      `Showed up: ${data.showed_up}`,
      `Active now: ${data.active_now}`,
      `Departed: ${data.departed} (fired ${data.departed_fired}, quit ${data.departed_quit}, unknown ${data.departed_unknown})`,
      `Tree revenue: ${money(data.tree_revenue) ?? NONE}`,
      `PRA per active rep: ${pra(data.active_now) ?? NONE}`,
      `PRA per person who showed up: ${pra(data.showed_up) ?? NONE}`,
      `Leader's own revenue: ${money(data.own_revenue) ?? NONE}`,
      `Committed last day coverage: ${data.committed_coverage_pct == null ? NONE : `${data.committed_coverage_pct}% (${data.committed_missing} missing)`}`,
      `Leader's own committed last day: ${data.leader?.committed_last_day ?? NONE}`,
      `Next season: ${
        Object.entries(data.next_season ?? {})
          .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`)
          .join(', ') || NONE
      }`,
    ].join('\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines());
      toast.success('Scorecard copied');
    } catch {
      toast.error('Could not copy the scorecard. Select the text and copy it manually.');
    }
  };

  const Cell = ({ label, value }: { label: string; value: string | null }) => (
    <div className={cn(CARD, 'p-3')}>
      <p className="micro-label">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value ?? NONE}</p>
    </div>
  );

  return (
    <div className="leader-scorecard space-y-3">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .leader-scorecard, .leader-scorecard * { visibility: visible; }
          .leader-scorecard { position: absolute; left: 0; top: 0; width: 100%; background: #fff; color: #000; }
          .leader-scorecard .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-center gap-2">
        <select
          value={office}
          onChange={(e) => setOffice(e.target.value)}
          className="h-10 rounded-lg border border-white/[0.06] bg-background/50 px-2 text-sm text-foreground"
        >
          <option value="">All offices</option>
          {offices.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className="h-10 rounded-lg border border-white/[0.06] bg-background/50 px-2 text-sm text-foreground"
        >
          <option value="">All time</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy as text
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">
          <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Building the scorecard…
        </p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">{NONE}</p>
      ) : (
        <>
          <div className={cn(CARD, 'p-4')}>
            <p className="text-base font-bold text-foreground">{data.leader?.name ?? NONE}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.leader?.office || 'No office set'}
              {data.leader?.vertical ? ` · ${data.leader.vertical}` : ''} · own committed last day:{' '}
              <span className="tabular-nums">{data.leader?.committed_last_day ?? NONE}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Cell label="Recruited" value={String(data.recruited)} />
            <Cell label="Showed up" value={String(data.showed_up)} />
            <Cell label="Active now" value={String(data.active_now)} />
            <Cell
              label="Departed"
              value={`${data.departed} (${data.departed_fired}f / ${data.departed_quit}q / ${data.departed_unknown}?)`}
            />
            <Cell label="Tree revenue" value={money(data.tree_revenue)} />
            <Cell label="Leader's own revenue" value={money(data.own_revenue)} />
            <Cell label="PRA - per active rep" value={pra(data.active_now)} />
            <Cell label="PRA - per person who showed up" value={pra(data.showed_up)} />
            <Cell
              label="Committed last day coverage"
              value={
                data.committed_coverage_pct == null
                  ? null
                  : `${data.committed_coverage_pct}% · ${data.committed_missing} missing`
              }
            />
          </div>

          {ladder && (
            <div className={cn(CARD, 'p-4')}>
              <p className="micro-label mb-3">{PAY_SCALE_LABELS[ladder.scale]} pay ladder</p>
              <p className="text-[13px] text-muted-foreground">{NOT_CONFIRMED}</p>
            </div>
          )}

          <div className={cn(CARD, 'p-4')}>
            <p className="micro-label">Next season</p>
            {Object.keys(data.next_season ?? {}).length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">{NONE}</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-foreground">
                {Object.entries(data.next_season).map(([k, v]) => (
                  <span key={k} className="tabular-nums">
                    {k.replace(/_/g, ' ')}: {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default LeaderScorecard;
