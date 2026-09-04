import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Fri, Sep 4 - plain, in the reader's own timezone. */
function today(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface HeroProps {
  /** The person's first name, when the profile is loaded. */
  firstName?: string | null;
  /** The workspace this home belongs to. */
  workspaceName: string;
  /** Days in a row, when this home already loads a streak. */
  streak?: number | null;
  /** The figure this home already shows for the period. */
  metric?: { label: string; value: number | string } | null;
  className?: string;
}

/**
 * The card at the top of a workspace home: who you are, what day it is, where
 * you are, your streak and the one figure this home already carries. Nothing
 * here fetches anything of its own.
 */
export function WorkspaceHero({ firstName, workspaceName, streak, metric, className }: HeroProps) {
  return (
    <section
      className={cn('hero-mesh rounded-[var(--radius)] border border-border/60 p-4', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {firstName && (
            <p className="truncate text-[19px] font-bold tracking-tight text-foreground">{firstName}</p>
          )}
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {today()} · {workspaceName}
          </p>
          {typeof streak === 'number' && streak > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-foreground">
              <Flame className="h-4 w-4 text-[hsl(var(--workspace-accent))]" strokeWidth={1.75} />
              <span className="tabular-nums">{streak}</span>
              {streak === 1 ? 'day in a row' : 'days in a row'}
            </p>
          )}
        </div>

        {metric && (
          <div className="flex-shrink-0 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="text-[32px] font-bold leading-none tracking-tight tabular-nums text-foreground">
              {metric.value}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default WorkspaceHero;
