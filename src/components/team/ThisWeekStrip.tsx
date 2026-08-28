import { useNavigate } from 'react-router-dom';
import { useManagerWeek } from '@/hooks/useManagerWeek';
import { CountUp } from '@/components/shared/CountUp';

/** Four stat tiles for the team's week. Tapping any tile opens My week. */
export function ThisWeekStrip() {
  const navigate = useNavigate();
  const { totals, scope, loading } = useManagerWeek();

  if (loading || scope === 'none') return null;

  const cells: { label: string; value: number }[] = [
    { label: 'Team sales', value: totals.sales },
    { label: 'Training minutes', value: totals.training },
    { label: 'Event answers due', value: totals.openRsvps },
    { label: 'Need attention', value: totals.attention },
  ];

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">This week</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 stagger sm:grid-cols-4">
        {cells.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate('/app/team')}
            className="card-ice min-h-11 px-3 py-2.5 text-left"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {c.label}
            </span>
            <CountUp value={c.value} className="mt-0.5 block font-display text-[22px] font-extrabold text-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}
