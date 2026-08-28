import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RollToFiberDialog } from '@/components/team/RollToFiberDialog';
import type { FiberCarrier, RollCandidate } from '@/hooks/useRollover';

interface Props {
  reps: RollCandidate[];
  carriers: FiberCarrier[];
  seasonEnd: string | null;
  onDone?: () => void;
}

/**
 * Admin and owner only: active pest reps with nowhere to go after the season.
 * Sorted by revenue to date when it is populated, otherwise by name.
 */
export function GoingColdCard({ reps, carriers, seasonEnd, onDone }: Props) {
  const [preselect, setPreselect] = useState<string | null>(null);

  const cold = reps
    .filter((r) => !r.hasFiber && !r.hasLife)
    .sort((a, b) => {
      const ar = a.revenue_to_date ?? 0;
      const br = b.revenue_to_date ?? 0;
      if (ar !== br) return br - ar;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Who goes cold</h2>
        <span className="tabular-nums text-sm text-muted-foreground">{cold.length}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Active pest reps with no fiber and no life workspace.
      </p>

      {cold.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Everyone has a next season.</p>
      ) : (
        <ul className="divide-y divide-border">
          {cold.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {r.full_name || 'Unnamed'}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0"
                onClick={() => setPreselect(r.user_id)}
              >
                Roll into Fiber
              </Button>
            </li>
          ))}
        </ul>
      )}

      {preselect && (
        <RollToFiberDialog
          open
          onOpenChange={(v) => !v && setPreselect(null)}
          reps={reps}
          carriers={carriers}
          seasonEnd={seasonEnd}
          preselect={preselect}
          onDone={() => {
            setPreselect(null);
            onDone?.();
          }}
        />
      )}
    </section>
  );
}

export default GoingColdCard;
