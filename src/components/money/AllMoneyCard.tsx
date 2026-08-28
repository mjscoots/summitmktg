import { useMoneySummary } from '@/hooks/useMoneySummary';
import { formatCurrency } from '@/lib/commission';
import { LoadingList } from '@/components/shared/LoadingList';
import { cn } from '@/lib/utils';

const CARD = 'rounded border border-border bg-card';

const KIND_LABEL: Record<string, string> = {
  sale: 'Sale logged',
  install: 'Install logged',
  housing: 'Housing',
};

function monthLabel(month: string) {
  const d = new Date(`${month}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short' });
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

/**
 * Money across every industry for one person. Numbers come from the existing
 * pay calculations; anything unset reads "Not set" and counts as zero.
 */
export function AllMoneyCard({ userId }: { userId?: string | null }) {
  const { data, loading } = useMoneySummary(userId ?? null);

  if (loading) return <LoadingList rows={3} />;
  if (!data) return null;

  const maxLine = Math.max(...data.lines.map((l) => l.amount), 1);
  const maxMonth = Math.max(...data.months.map((m) => m.pest + m.fiber), 1);
  const thisMonth = currentMonth();

  return (
    <div className="space-y-4">
      <section className={cn(CARD, 'p-5 sm:p-6')}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Estimated this season, all industries
        </p>
        <p className="mt-1 font-display text-[56px] font-black leading-none tabular-nums text-foreground">
          {formatCurrency(data.total)}
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Estimates from what you have logged. Pay is confirmed by your leader.
        </p>

        <div className="mt-6 space-y-4">
          {data.lines.map((l) => (
            <div key={l.vertical}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{l.label}</span>
                <span className="tabular-nums text-sm font-semibold text-foreground">
                  {l.note ?? formatCurrency(l.amount)}
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((l.amount / maxLine) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{l.driver}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{l.source}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(CARD, 'p-5 sm:p-6')}>
        <h2 className="text-sm font-semibold text-foreground">Month by month</h2>
        {data.months.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <div className="mt-4 flex items-end gap-2 overflow-x-auto">
            {data.months.map((m) => {
              const total = m.pest + m.fiber;
              const h = Math.max(Math.round((total / maxMonth) * 120), 2);
              const isNow = m.month === thisMonth;
              const pestShare = total > 0 ? m.pest / total : 0;
              return (
                <div key={m.month} className="flex min-w-9 flex-1 flex-col items-center gap-2">
                  <div
                    className="flex w-full max-w-10 flex-col justify-end overflow-hidden rounded-sm"
                    style={{ height: h }}
                  >
                    <div
                      style={{ height: `${Math.round(pestShare * 100)}%` }}
                      className={isNow ? 'bg-primary' : 'bg-[hsl(var(--border-strong))]'}
                    />
                    <div
                      style={{ height: `${100 - Math.round(pestShare * 100)}%` }}
                      className={isNow ? 'bg-primary/60' : 'bg-surface-elevated'}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{monthLabel(m.month)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={cn(CARD, 'p-5 sm:p-6')}>
        <h2 className="text-sm font-semibold text-foreground">Where it comes from</h2>
        {data.raw.events.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {data.raw.events.map((e, i) => {
              const negative = e.amount !== null && Number(e.amount) < 0;
              return (
                <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-16 shrink-0 tabular-nums text-xs text-muted-foreground">
                    {e.at
                      ? new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : '—'}
                  </span>
                  <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {e.vertical}
                  </span>
                  <span className="min-w-0 truncate text-foreground">
                    {KIND_LABEL[e.kind] ?? e.kind}
                    {e.description && e.kind !== 'housing' ? ` · ${e.description}` : ''}
                  </span>
                  <span
                    className={cn(
                      'ml-auto shrink-0 tabular-nums',
                      negative ? 'text-muted-foreground' : 'text-foreground'
                    )}
                  >
                    {e.amount === null
                      ? '—'
                      : negative
                      ? `-${formatCurrency(Math.abs(Number(e.amount)))}`
                      : formatCurrency(Number(e.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default AllMoneyCard;
