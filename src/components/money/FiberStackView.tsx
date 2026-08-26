import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/commission';

interface StackRow {
  rank: string;
  sort_order: number;
  value: number | null;
}

interface CarrierTable {
  carrier_id: string;
  carrier: string;
  confirmed?: boolean;
  rows: StackRow[] | null;
}

const CARD = 'rounded-xl border border-border bg-card';

const RULE_ORDER: { key: string; label: string }[] = [
  { key: 'installs', label: 'Installs counted' },
  { key: 'tiers', label: 'Tiers' },
  { key: 'floor', label: 'Floor' },
  { key: 'leaders', label: 'Leaders' },
  { key: 'bring_a_buddy', label: 'Bring a buddy' },
  { key: 'entry', label: 'Entry' },
  { key: 'hold', label: 'Hold' },
  { key: 'chargebacks', label: 'Chargebacks' },
  { key: 'housing', label: 'Housing' },
  { key: 'car', label: 'Car' },
];

/** Fiber pay: what each install pays at each tier, plus the pay rules. No calculator. */
export function FiberStackView() {
  const [carriers, setCarriers] = useState<CarrierTable[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [rules, setRules] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc('get_fiber_stack_table');
      setCarriers((data?.carriers as CarrierTable[]) || []);
      setSource((data?.source as string) || null);
      try {
        const raw = data?.rules;
        setRules(raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null);
      } catch {
        setRules(null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;

  if (carriers.length === 0) {
    return (
      <section className={`${CARD} p-5`}>
        <h2 className="text-sm font-medium text-foreground">Per-install pay</h2>
        <p className="mt-1 text-sm text-muted-foreground">Rate shared when confirmed.</p>
      </section>
    );
  }

  const ruleRows = rules ? RULE_ORDER.filter((r) => rules[r.key]) : [];

  return (
    <div className="space-y-4">
      {carriers.map((c) => (
        <section key={c.carrier_id} className={`${CARD} p-5`}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium tracking-tight text-foreground">{c.carrier}</h2>
            {!c.confirmed && <span className="text-xs text-muted-foreground">Rate shared when confirmed</span>}
          </div>
          {c.rows && c.rows.length > 0 ? (
            <div className="divide-y divide-border">
              {[...c.rows]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((r) => (
                  <div key={r.rank} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-foreground">{r.rank}</span>
                    <span className="tabular-nums text-primary">
                      {c.confirmed && r.value !== null ? `${formatCurrency(r.value)} per install` : 'Rate shared when confirmed'}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Rate shared when confirmed.</p>
          )}
        </section>
      ))}
    </div>
  );
}

export default FiberStackView;
