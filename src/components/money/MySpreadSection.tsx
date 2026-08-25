import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Split } from 'lucide-react';
import { formatCurrency } from '@/lib/commission';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

interface SpreadRow {
  user_id: string;
  name: string | null;
  rank: string | null;
  rep_stack: number | null;
  my_stack: number | null;
  spread: number | null;
  sourced_by: string;
  my_share: number | null;
}

interface SpreadView {
  carrier: string | null;
  my_stack: number | null;
  expense_allowance: number | null;
  vertical_lead_margin: string | null;
  rows: SpreadRow[];
}

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? 'Not set' : formatCurrency(Number(v));

/** Managers+ with a fiber enrollment: per paired rep spread and the split rule applied. */
export function MySpreadSection() {
  const [data, setData] = useState<SpreadView | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: res } = await (supabase as any).rpc('get_my_spread');
      if (!active) return;
      setData((res as SpreadView) ?? null);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!data || data.rows.length === 0) return null;

  return (
    <section className={cn(CARD, 'p-5 sm:p-6')}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/30 to-primary/10">
          <Split className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">My spread</h2>
          <p className="text-xs text-muted-foreground">
            Fiber{data.carrier ? ` · ${data.carrier}` : ''} · your paired reps
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Cell label="My stack" value={money(data.my_stack)} />
        <Cell label="Expense allowance per install" value={money(data.expense_allowance)} />
        <Cell
          label="Summit margin"
          value={data.vertical_lead_margin ? money(Number(data.vertical_lead_margin)) : 'Not set'}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Rep</th>
              <th className="px-4 py-2 font-medium text-right">Their stack</th>
              <th className="px-4 py-2 font-medium text-right">My stack</th>
              <th className="px-4 py-2 font-medium text-right">Spread</th>
              <th className="px-4 py-2 font-medium">Sourced by</th>
              <th className="px-4 py-2 font-medium text-right">My share</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.user_id} className="border-t border-white/[0.05]">
                <td className="px-4 py-2 text-foreground">
                  {r.name || '—'}
                  {r.rank && <span className="ml-2 text-xs text-muted-foreground">{r.rank}</span>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{money(r.rep_stack)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{money(r.my_stack)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{money(r.spread)}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.sourced_by}</td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold text-foreground">
                  {money(r.my_share)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Summit-sourced: spread minus the expense allowance, then split 50/50 with Summit. Self-sourced:
        the full spread stays with you. Anything not set is left blank rather than estimated.
      </p>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-background/40 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export default MySpreadSection;
