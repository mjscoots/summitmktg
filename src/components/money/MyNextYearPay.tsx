import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/commission';
import { repYearLabel } from '@/lib/repYear';

interface PayRow {
  carrier: string;
  value: number;
}

interface NextYearPay {
  current_year: number;
  next_year: number;
  tier_name: string | null;
  rows: PayRow[] | null;
}

const CARD = 'rounded-xl border border-border bg-card';

/** A rep's own next season pay tier. Their tier only, no one else's. */
export function MyNextYearPay() {
  const [data, setData] = useState<NextYearPay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: res } = await (supabase as any).rpc('my_next_year_pay');
      if (cancelled) return;
      setData((res as NextYearPay) || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <section className={`${CARD} p-5`}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Fiber, next season</p>
        <h2 className="mt-1 text-sm font-medium tracking-tight text-foreground">
          {repYearLabel(data?.next_year ?? 2)}
          {data?.tier_name ? ` · ${data.tier_name}` : ''}
        </h2>
        {rows.length > 0 ? (
          <div className="mt-3 divide-y divide-border">
            {rows.map((r) => (
              <div key={r.carrier} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">{r.carrier}</span>
                <span className="tabular-nums text-primary">{formatCurrency(r.value)} per install</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Rate shared when confirmed.</p>
        )}
        <p className="mt-3 text-[12px] text-muted-foreground">
          Your tier only. Everyone moves up one year next season.
        </p>
      </section>

      <section className={`${CARD} p-5`}>
        <h2 className="text-sm font-medium tracking-tight text-foreground">Pest</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pest pay scale drops here when the owner loads it.
        </p>
      </section>
    </div>
  );
}

export default MyNextYearPay;
