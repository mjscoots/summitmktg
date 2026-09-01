import { useNavigate } from 'react-router-dom';
import { useManagerOwed } from '@/hooks/useManagerOwed';
import { cn } from '@/lib/utils';

interface OwedLine {
  label: string;
  count: number;
  to: string;
  past?: boolean;
}

/** What the manager owes this week: counts and nouns, each line gone at zero. */
export function OwedThisWeek() {
  const navigate = useNavigate();
  const { owed, loading } = useManagerOwed();

  if (loading || owed.scope === 'none') return null;

  const lines: OwedLine[] = [
    { label: 'Calls due', count: owed.calls_due, to: '/app/leads', past: true },
    { label: 'Applications you own', count: owed.apps_owned, to: '/admin/requests' },
    {
      label: 'Applications unclaimed over 24 hours',
      count: owed.apps_unclaimed_old,
      to: '/admin/requests',
      past: true,
    },
    { label: 'Reps with no training this week', count: owed.reps_no_training, to: '/app/team' },
    {
      label: 'Reps you have not logged a one on one with this week. Tap to open the prep sheet.',
      count: owed.one_on_ones_missing,
      to: '/app/one-on-ones/prep',
    },
  ].filter((l) => l.count > 0);

  return (
    <section className="rounded-[10px] border border-border bg-card p-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        What you owe this week
      </h2>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-foreground">Nothing owed. Go find someone.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {lines.map((l) => (
            <li key={l.label}>
              <button
                type="button"
                onClick={() => navigate(l.to)}
                className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
              >
                <span className="min-w-0 text-[13px] text-foreground">{l.label}</span>
                <span
                  className={cn(
                    'shrink-0 text-sm font-semibold tabular-nums text-foreground',
                    l.past && 'chip-warm'
                  )}
                >
                  {l.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
