import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMyFiberStart } from '@/hooks/useRollover';
import { daysUntil, formatStart } from '@/lib/rollover';

/**
 * Rep-facing rollover card on Pest home. No pay figures - money stays on the
 * money screens under the existing visibility rules.
 */
export function FiberStartCard() {
  const { start, carrier } = useMyFiberStart();
  const { switchWorkspace } = useWorkspace();

  if (!start || daysUntil(start) < -14) return null;

  return (
    <section className="rounded-2xl border border-[hsl(var(--fiber-mint))]/30 bg-card/60 p-4">
      <p className="text-sm font-semibold text-[hsl(var(--fiber-mint))]">
        Fiber starts {formatStart(start)}
      </p>
      {carrier && <p className="mt-1 text-sm text-muted-foreground">{carrier}</p>}
      <p className="mt-1 text-sm text-muted-foreground">
        Your installs and pay live in the Fiber workspace.
      </p>
      <Button
        variant="outline"
        className="mt-3 min-h-11"
        onClick={() => void switchWorkspace('Fiber')}
      >
        See Fiber
      </Button>
    </section>
  );
}

export default FiberStartCard;
