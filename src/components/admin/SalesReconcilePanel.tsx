import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface Row {
  user_id: string;
  full_name: string | null;
  logged_sales: number;
  logged_revenue: number;
  imported_revenue: number;
  reconciled: boolean;
}

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const money = (n: number) => `$${Math.round(Number(n || 0)).toLocaleString()}`;

/**
 * Staff view comparing what reps logged themselves against the imported
 * revenue for one month. Marking a rep reconciled changes no sale data.
 */
export function SalesReconcilePanel() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)('get_sales_reconciliation', {
      p_month: `${month}-01`,
    });
    if (error) toast.error('Could not load that month.');
    setRows((data as Row[]) || []);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markReconciled(userId: string) {
    setBusy(userId);
    const { error } = await (supabase.rpc as any)('mark_sales_reconciled', {
      p_user_id: userId,
      p_month: `${month}-01`,
    });
    setBusy(null);
    if (error) {
      toast.error('That did not save.');
      return;
    }
    await load();
    toast.success('Marked reconciled');
  }

  return (
    <section className={`${CARD} p-5 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Self-reported vs imported</h3>
          <p className="text-xs text-muted-foreground">
            Nothing is changed or removed automatically.
          </p>
        </div>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-11 w-[170px]"
        />
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No sales logged for that month.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Rep</th>
                <th className="py-2 pr-3 text-right">Logged</th>
                <th className="py-2 pr-3 text-right">Logged initial</th>
                <th className="py-2 pr-3 text-right">Imported</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border/40">
                  <td className="py-2 pr-3">{r.full_name || 'Rep'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.logged_sales}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(r.logged_revenue)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(r.imported_revenue)}</td>
                  <td className="py-2 text-right">
                    {r.reconciled ? (
                      <span className="text-muted-foreground">Reconciled</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        disabled={busy === r.user_id}
                        onClick={() => void markReconciled(r.user_id)}
                      >
                        Mark reconciled
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default SalesReconcilePanel;
