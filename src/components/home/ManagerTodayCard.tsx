import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useManagerDay } from '@/hooks/useManagerDay';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Today, at the top of a manager home: the same five counts the Today screen
 * carries, read from manager_day so the database decides the scope.
 */
export function ManagerTodayCard() {
  const navigate = useNavigate();
  const { day, loading, total, isManager } = useManagerDay();

  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!isManager) return null;

  const lines: { key: string; text: string }[] = [
    { key: 'radar', text: `Call today: ${day.radar_count || 0}` },
    { key: 'owed', text: `One on ones owed this week: ${day.owed_count || 0}` },
    { key: 'stuck', text: `Stuck on onboarding: ${day.stuck_count || 0}` },
    { key: 'blitz', text: `Blitz RSVPs still open: ${day.blitz_open_count || 0}` },
    { key: 'awaiting', text: `Waiting to be placed: ${day.awaiting_count || 0}` },
  ];

  return (
    <button
      type="button"
      onClick={() => navigate('/app/day')}
      className="w-full rounded-[var(--radius)] bg-card p-4 text-left transition-colors hover:bg-secondary"
    >
      <div className="flex items-center gap-3">
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>

      {total === 0 ? (
        <p className="mt-2 text-[14px] text-foreground">Clear today</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {lines.map((line) => (
            <li key={line.key} className="text-[14px] text-foreground">
              {line.text}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

export default ManagerTodayCard;
