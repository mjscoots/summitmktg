import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useManagerDay } from '@/hooks/useManagerDay';

/**
 * One line at the top of Home for manager and above: how many things today
 * need a decision. Hidden for reps and hidden when all five are zero.
 */
export function TodayRow() {
  const navigate = useNavigate();
  const { isManager, total, loading } = useManagerDay();

  if (loading || !isManager || total === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/app/day')}
      className="mb-4 flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-card/60 px-4 py-2 text-left transition-colors hover:bg-secondary"
    >
      <span className="flex-1 text-[14px] text-foreground">
        Today: {total} {total === 1 ? 'thing' : 'things'}
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

export default TodayRow;
