import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Sentence case, says what the person does here. */
  title: string;
  /** One line of context. No more. */
  context?: string;
  /** The one primary action for this screen, right aligned. */
  action?: ReactNode;
  /** Shown when a person works in more than one vertical. */
  vertical?: string | null;
  className?: string;
}

/**
 * The one page header pattern for every app screen: title, one line of
 * context, primary action on the right, current vertical when it matters.
 */
export function PageHeader({ title, context, action, vertical, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {vertical ? (
            <span className="rounded border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {vertical}
            </span>
          ) : null}
        </div>
        {context ? <p className="mt-1 text-sm text-muted-foreground">{context}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}

export default PageHeader;
