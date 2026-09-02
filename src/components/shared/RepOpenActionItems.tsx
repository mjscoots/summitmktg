import { useActionItems } from '@/hooks/useActionItems';
import { cn } from '@/lib/utils';
import { Check, ListChecks } from 'lucide-react';

/** A rep's open action items - used in 1:1 prep so the manager walks in loaded. */
export function RepOpenActionItems({ userId, className }: { userId: string; className?: string }) {
  const { items, loading, complete } = useActionItems(userId);
  const today = new Date().toISOString().slice(0, 10);

  if (loading) return null;

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card/60 p-3', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <ListChecks className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-xs font-semibold text-foreground">Open action items</h4>
        <span className="ml-auto text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">None open.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(i => {
            const overdue = i.due_date && i.due_date < today;
            return (
              <li key={i.id} className="flex items-center gap-2">
                <button
                  onClick={() => complete(i.id)}
                  aria-label={`Mark "${i.title}" done`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Check className="h-3 w-3" />
                </button>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{i.title}</span>
                {i.due_date && (
                  <span
                    className={cn(
                      'shrink-0 text-[10px]',
                      overdue ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {overdue ? 'Overdue' : i.due_date.slice(5)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
