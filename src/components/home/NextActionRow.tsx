import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useNextAction } from '@/hooks/useNextAction';

/** One row under the number. Hidden when there is nothing to do. */
export function NextActionRow() {
  const navigate = useNavigate();
  const { action, loading } = useNextAction();

  if (loading || !action) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(action.to)}
      className="next-action-in flex min-h-11 w-full items-center gap-3 rounded-[var(--radius)] bg-card px-4 py-3 text-left transition-colors hover:bg-secondary"
    >
      <span className="flex-1 text-[14px] text-foreground">{action.text}</span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

export default NextActionRow;
