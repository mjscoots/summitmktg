import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import type { BlitzCapState } from '@/hooks/useBlitzCap';

interface Props {
  state: BlitzCapState | null;
  busy?: boolean;
  attending: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

/**
 * Pass 146 — spots left, the waitlist action, and for managers and above the
 * waiting names in join order. Renders nothing when the blitz has no cap.
 */
export function BlitzCapBar({ state, busy, attending, onJoin, onLeave }: Props) {
  if (!state || state.capacity == null) return null;

  const cap = state.capacity;
  const left = state.spots_left ?? 0;
  const onList = state.my_position != null;
  const full = left === 0;

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <p className="text-[12px] tabular-nums text-muted-foreground">
        {full ? `Blitz is full · ${cap} spots taken` : `${left} of ${cap} spots left`}
      </p>

      {onList && (
        <p className="mt-1 text-[12px] text-foreground">
          You are number {state.my_position} on the waitlist
        </p>
      )}

      {!attending && (full || onList) && (
        <button
          onClick={onList ? onLeave : onJoin}
          disabled={busy}
          className={cn(
            'mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold disabled:opacity-60',
            onList
              ? 'border border-border/60 bg-surface text-muted-foreground hover:text-foreground'
              : 'bg-primary text-primary-foreground',
          )}
        >
          {onList ? 'Leave waitlist' : 'Join waitlist'}
        </button>
      )}

      {state.is_staff && state.waitlist && state.waitlist.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Waitlist
          </p>
          <ol className="mt-1 space-y-0.5">
            {state.waitlist.map((w) => (
              <li key={w.user_id} className="text-[12px] text-foreground">
                {w.position}. {w.name || 'Team member'}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
