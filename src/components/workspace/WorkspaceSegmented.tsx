import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace, type Workspace } from '@/contexts/WorkspaceContext';
import { RequestVerticalAccessDialog } from '@/components/workspace/RequestVerticalAccessDialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

/** One accent across the three doors: lime, the primary of the system. */
const ACCENT: Record<string, string> = {
  Pest: '81 90% 60%',
  Fiber: '81 90% 60%',
  Life: '81 90% 60%',
};

const ORDER = ['Pest', 'Fiber', 'Life'];
const byOrder = (a: Workspace, b: Workspace) => ORDER.indexOf(a.vertical) - ORDER.indexOf(b.vertical);

/**
 * Pass 76 - the workspace switch as a segmented control. One row, one tap,
 * the active workspace in its own accent.
 *
 * Pass 149 - the row lists only the industries the person has been accepted
 * into. The rest stay as quiet locked rows that open a request, so nothing
 * opens without the owner's approval and a person in one industry sees no
 * switch at all.
 *
 * Pass 210 - a rep in exactly one industry still gets the control. The row
 * always shows all three doors: the ones they belong to are selectable, the
 * rest are muted and read "Ask to join", which takes them to /app/industries
 * and writes nothing. Staff keep the Pass 149 view.
 */
export function WorkspaceSegmented({
  collapsed,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { myWorkspaces: workspaces, lockedWorkspaces, activeVertical, switchWorkspace } = useWorkspace();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [asking, setAsking] = useState<Workspace | null>(null);

  const isStaff = role === 'admin' || role === 'owner';
  const canEditLife = isStaff || workspaces.some((w) => w.vertical === 'Life' && w.is_president);
  const locked = lockedWorkspaces;

  // Pass 210 - reps see one row of all three doors whenever they belong to at
  // least one. Staff fall through to the Pass 149 behaviour below.
  const repRow = !isStaff && workspaces.length >= 1;

  if (!repRow && workspaces.length < 2 && locked.length === 0) return null;

  if (collapsed) {
    if (!repRow && workspaces.length < 2) return null;
    const chips = repRow ? [...workspaces, ...locked].sort(byOrder) : [...workspaces].sort(byOrder);
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        {chips.map((w) => {
          const mine = workspaces.some((m) => m.vertical === w.vertical);
          const active = mine && w.vertical === activeVertical;
          return (
            <button
              key={w.vertical}
              onClick={() => (mine ? switchWorkspace(w.vertical) : navigate('/app/industries'))}
              aria-label={mine ? w.name : `${w.name}, ask to join`}
              aria-disabled={mine ? undefined : 'true'}
              aria-current={active ? 'true' : undefined}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-semibold"
              style={{
                color: active
                  ? `hsl(${ACCENT[w.vertical] || '81 90% 60%'})`
                  : mine
                    ? 'hsl(var(--text-muted))'
                    : 'hsl(var(--muted-foreground))',
                opacity: mine ? 1 : 0.5,
                background: active ? `hsl(${ACCENT[w.vertical] || '81 90% 60%'} / 0.12)` : 'transparent',
              }}
            >
              {(w.short_name || w.vertical).slice(0, 1)}
            </button>
          );
        })}
      </div>
    );
  }

  if (repRow) {
    const chips = [...workspaces, ...locked].sort(byOrder);
    return (
      <div className={cn('space-y-1.5', className)}>
        <div
          className="flex items-stretch gap-0.5 rounded-xl p-0.5"
          style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))' }}
          role="group"
          aria-label="Switch workspace"
        >
          {chips.map((w) => {
            const mine = workspaces.some((m) => m.vertical === w.vertical);
            const active = mine && w.vertical === activeVertical;
            const accent = ACCENT[w.vertical] || '81 90% 60%';
            return (
              <button
                key={w.vertical}
                onClick={() => (mine ? switchWorkspace(w.vertical) : navigate('/app/industries'))}
                aria-current={active ? 'true' : undefined}
                aria-disabled={mine ? undefined : 'true'}
                aria-label={mine ? w.name : `${w.name}, ask to join`}
                className="min-h-11 flex-1 truncate rounded-[10px] px-2 py-1.5 text-[12px] font-semibold transition-colors"
                style={{
                  color: active ? `hsl(${accent})` : 'hsl(var(--text-muted))',
                  background: active ? `hsl(${accent} / 0.12)` : 'transparent',
                  opacity: mine ? 1 : 0.55,
                }}
              >
                <span className="block truncate">{w.short_name || w.vertical}</span>
                {!mine && (
                  <span className="block truncate text-[10px] font-medium text-muted-foreground">Ask to join</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }


  return (
    <div className={cn('space-y-1.5', className)}>
      {workspaces.length > 1 && (
        <div
          className="flex items-stretch gap-0.5 rounded-xl p-0.5"
          style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))' }}
          role="group"
          aria-label="Switch workspace"
        >
          {[...workspaces].sort((a, b) => ['Pest', 'Fiber', 'Life'].indexOf(a.vertical) - ['Pest', 'Fiber', 'Life'].indexOf(b.vertical)).map((w) => {
            const active = w.vertical === activeVertical;
            const accent = ACCENT[w.vertical] || '81 90% 60%';
            return (
              <button
                key={w.vertical}
                onClick={() => switchWorkspace(w.vertical)}
                aria-current={active ? 'true' : undefined}
                className="min-h-8 flex-1 truncate rounded-[10px] px-2 py-1.5 text-[12px] font-semibold transition-colors"
                style={{
                  color: active ? `hsl(${accent})` : 'hsl(var(--text-muted))',
                  background: active ? `hsl(${accent} / 0.12)` : 'transparent',
                }}
              >
                {w.short_name || w.vertical}
              </button>
            );
          })}
        </div>
      )}

      {[...locked].sort((a, b) => ['Pest', 'Fiber', 'Life'].indexOf(a.vertical) - ['Pest', 'Fiber', 'Life'].indexOf(b.vertical)).map((w) => {
        const pending = w.request_status === 'pending';
        const comingSoon = w.vertical === 'Life' && !canEditLife ? true : w.status === 'coming_soon';
        return (
          <button
            key={w.vertical}
            onClick={() => !comingSoon && setAsking(w)}
            disabled={comingSoon}
            className="grid min-h-11 w-full grid-cols-[auto_1fr] items-center gap-x-2 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-foreground/5 disabled:opacity-60"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate text-[13px] font-medium text-foreground">{w.short_name || w.name}</span>
            </span>
            <span className="justify-self-end text-[11px] text-muted-foreground">
              {comingSoon
                ? w.vertical === 'Life' ? 'Coming' : 'Not open yet'
                : pending
                  ? 'Requested, waiting on approval'
                  : 'By approval'}
            </span>
            {w.vertical === 'Fiber' && <span className="col-span-2 pl-[22px] text-[11px] text-muted-foreground">Off season lane</span>}
          </button>
        );
      })}

      <RequestVerticalAccessDialog
        workspace={asking}
        open={Boolean(asking)}
        onOpenChange={(next) => !next && setAsking(null)}
      />
    </div>
  );
}
