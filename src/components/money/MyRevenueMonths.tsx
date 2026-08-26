import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/commission';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

/** Pest revenue months for the signed-in rep, entered by an admin. */
export function MyRevenueMonths() {
  const [months, setMonths] = useState<{ month: string; revenue: number | null }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await (supabase as any).rpc('get_my_revenue');
      if (!active) return;
      setMonths((data?.rows as any[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className={cn(CARD, 'p-5 sm:p-6')}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/30">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Monthly revenue</h2>
          <p className="text-xs text-muted-foreground">Entered by an admin</p>
        </div>
      </div>

      {months.length === 0 ? (
        <p className="text-sm text-muted-foreground">No months entered yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
          {months.map((m) => (
            <div
              key={m.month}
              className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2.5 text-sm first:border-t-0"
            >
              <span className="text-muted-foreground">
                {new Date(m.month + 'T00:00:00').toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span className="tabular-nums font-semibold text-foreground">
                {formatCurrency(Number(m.revenue) || 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default MyRevenueMonths;
