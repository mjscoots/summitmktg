import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Skeleton } from '@/components/ui/skeleton';

interface Carrier {
  carrier_id: string;
  name: string;
}

interface LadderRow {
  rank_id: string;
  rank: string;
  sort_order: number;
  leader: boolean;
  values: Record<string, number | null>;
}

interface Ladder {
  can_see_leaders: boolean;
  source: string | null;
  carriers: Carrier[];
  rows: LadderRow[];
}

interface Rule {
  key: string;
  title: string;
  body: string;
  leader_only: boolean;
  sort_order: number;
}

const CARD = 'rounded-xl border border-border bg-card';

/** The rank column stays put; carriers scroll sideways on a phone. */
const RANK_COL = 'sticky left-0 z-10 bg-card px-3 py-2 text-left';

/**
 * Pass 154 - the Fiber pay ladder, built live from ranks, carriers and
 * rank_stacks. A value only ever appears where the database marked that stack
 * confirmed, and the leader rows come back without values for reps because the
 * fiber_ladder function strips them server side.
 */
export default function FiberLadderPage() {
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [l, r] = await Promise.all([
        (supabase as any).rpc('fiber_ladder'),
        (supabase as any)
          .from('fiber_rules')
          .select('key, title, body, leader_only, sort_order')
          .order('sort_order'),
      ]);
      setLadder((l.data as Ladder) || null);
      setRules((r.data as Rule[]) || []);
      setLoading(false);
    })();
  }, []);

  const carriers = ladder?.carriers ?? [];
  const rows = ladder?.rows ?? [];

  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <PageBackButton to="/app/money" label="Back" />
        <PageHeader title="Fiber ladder" context="Pay per install, by carrier." />

        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : rows.length === 0 ? (
          <section className={`${CARD} p-5`}>
            <p className="text-[15px] text-muted-foreground">The ladder appears here once the ranks are set up.</p>
          </section>
        ) : (
          <section className={`${CARD} p-3 sm:p-5`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`${RANK_COL} text-[12px] font-medium uppercase tracking-wide text-muted-foreground`}>
                      Rank
                    </th>
                    {carriers.map((c) => (
                      <th
                        key={c.carrier_id}
                        className="whitespace-nowrap px-3 py-2 text-right text-[12px] font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rank_id} className="border-b border-border last:border-0">
                      <th scope="row" className={`${RANK_COL} font-normal text-foreground`}>
                        <span className="block max-w-[190px] text-[13px] leading-snug">{row.rank}</span>
                      </th>
                      {carriers.map((c) => {
                        const v = row.values?.[c.carrier_id];
                        return (
                          <td
                            key={c.carrier_id}
                            className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-primary"
                          >
                            {typeof v === 'number' ? `$${Math.round(v).toLocaleString()}` : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!ladder?.can_see_leaders && (
              <p className="mt-3 text-[12px] text-muted-foreground">
                Leader rows are shown by name. Your manager can walk you through them.
              </p>
            )}
            {ladder?.source && <p className="mt-2 text-[12px] text-muted-foreground">{ladder.source}</p>}
          </section>
        )}

        {rules.length > 0 && (
          <section className={`${CARD} p-5`}>
            <h2 className="mb-3 text-sm font-medium tracking-tight text-foreground">Pay rules</h2>
            <dl className="divide-y divide-border">
              {rules.map((r) => (
                <div key={r.key} className="py-2.5">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{r.title}</dt>
                  <dd className="mt-1 text-[14px] leading-relaxed text-foreground">{r.body}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </main>
    </AppLayout>
  );
}
