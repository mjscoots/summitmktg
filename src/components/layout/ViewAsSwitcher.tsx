import { useAuth, ViewAsRole } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const OPTIONS: { key: ViewAsRole; label: string }[] = [
  { key: 'manager', label: 'Manager' },
  { key: 'vet', label: 'Returning rep' },
  { key: 'rookie', label: 'First year rep' },
];

/**
 * Pass 148 - owner and admin only. Renders the app as a lower role so the
 * access separation can be checked from the owner's own account.
 */
export function ViewAsSwitcher() {
  const { realRole, viewAs, setViewAs } = useAuth();

  if (realRole !== 'owner' && realRole !== 'admin') return null;

  return (
    <section className="space-y-2">
      <p className="eyebrow px-1">View as</p>
      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <p className="text-[13px] text-muted-foreground">
          See the app the way another role sees it. Nothing is saved and no action is taken on
          anyone else's behalf.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {OPTIONS.map((o) => {
            const on = viewAs === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setViewAs(on ? null : o.key)}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-[14px] font-semibold',
                  on
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-background text-foreground'
                )}
              >
                {o.label}
              </button>
            );
          })}
          {viewAs && (
            <button
              type="button"
              onClick={() => setViewAs(null)}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-[14px] font-semibold text-muted-foreground"
            >
              Back to my view
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default ViewAsSwitcher;
