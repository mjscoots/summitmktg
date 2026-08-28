import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNextTraining } from '@/hooks/useNextTraining';

/**
 * Pass 101 — Learn opens with one card: the next required lesson or mastery
 * check in the rep's track.
 */
export function NextUpCard({ track = 'rookie' }: { track?: 'rookie' | 'manager' }) {
  const navigate = useNavigate();
  const { next, isLoading } = useNextTraining(track);

  if (isLoading) {
    return <Skeleton className="mb-4 h-28 w-full rounded-xl" />;
  }

  if (!next) {
    return (
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Next up</p>
        <p className="mt-1 text-[15px] text-foreground">Every required lesson and mastery check is done.</p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Next up</p>
      <div className="mt-2 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {next.kind === 'mastery' ? <Mic className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-extrabold text-foreground">
            {next.kind === 'mastery' ? `Mastery check — ${next.title}` : next.title}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {next.courseTitle} · {next.moduleTitle}
          </p>
        </div>
      </div>
      <Button className="mt-3 min-h-11 w-full rounded-full" onClick={() => navigate(next.route)}>
        Continue
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

export default NextUpCard;
