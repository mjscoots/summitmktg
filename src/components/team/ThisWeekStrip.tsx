import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useManagerWeek } from '@/hooks/useManagerWeek';

/** Compact team summary for the week, linking to the full My week screen. */
export function ThisWeekStrip() {
  const navigate = useNavigate();
  const { totals, scope, loading } = useManagerWeek();

  if (loading || scope === 'none') return null;

  const cells: { label: string; value: string }[] = [
    { label: 'Team sales', value: String(totals.sales) },
    { label: 'Training minutes', value: String(totals.training) },
    { label: 'Event answers due', value: String(totals.openRsvps) },
    { label: 'Need attention', value: String(totals.attention) },
  ];

  return (
    <section className="rounded-[10px] border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">This week</h2>
        <Button variant="outline" size="sm" className="min-h-11" onClick={() => navigate('/app/week')}>
          My week
        </Button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</dt>
            <dd className="text-lg font-semibold tabular-nums text-foreground">{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
