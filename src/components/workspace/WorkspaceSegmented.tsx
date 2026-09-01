import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useWorkspace, type Workspace } from '@/contexts/WorkspaceContext';
import { RequestVerticalAccessDialog } from '@/components/workspace/RequestVerticalAccessDialog';
import { cn } from '@/lib/utils';

/** The accent a workspace owns, used only on the active segment. */
const ACCENT: Record<string, string> = {
  Pest: '197 100% 68%',
  Fiber: '158 70% 55%',
  Life: '218 100% 56%',
};

/**
 * Pass 76 — the workspace switch as a segmented control. One row, one tap,
 * the active workspace in its own accent.
 *
 * Pass 149 — the row lists only the industries the person has been accepted
 * into. The rest stay as quiet locked rows that open a request, so nothing
 * opens without the owner's approval and a person in one industry sees no
 * switch at all.
 */
export function WorkspaceSegmented({
  collapsed,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { myWorkspaces: workspaces, lockedWorkspaces, activeVertical, switchWorkspace } = useWorkspace();
  const [asking, setAsking] = useState<Workspace | null>(null);

  const locked = lockedWorkspaces;
  if (workspaces.length < 2 && locked.length === 0) return null;

  if (collapsed) {
    if (workspaces.length < 2) return null;
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        {workspaces.map((w) => {
          const active = w.vertical === activeVertical;
          return (
            <button
              key={w.vertical}
              onClick={() => switchWorkspace(w.vertical)}
              aria-label={w.name}
              aria-current={active ? 'true' : undefined}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-semibold"
              style={{
                color: active ? `hsl(${ACCENT[w.vertical] || '197 100% 68%'})` : 'hsl(var(--text-muted))',
                background: active ? `hsl(${ACCENT[w.vertical] || '197 100% 68%'} / 0.12)` : 'transparent',
              }}
            >
              {(w.short_name || w.vertical).slice(0, 1)}
            </button>
          );
        })}
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
          {workspaces.map((w) => {
            const active = w.vertical === activeVertical;
            const accent = ACCENT[w.vertical] || '197 100% 68%';
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

      {locked.map((w) => {
        const pending = w.request_status === 'pending';
        const comingSoon = w.status === 'coming_soon';
        return (
          <button
            key={w.vertical}
            onClick={() => !comingSoon && setAsking(w)}
            disabled={comingSoon}
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-left transition-colors hover:bg-foreground/5 disabled:opacity-60"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate text-[13px] font-medium text-foreground">{w.short_name || w.name}</span>
            </span>
            <span className="flex-shrink-0 text-[11px] text-muted-foreground">
              {comingSoon
                ? 'Not open yet'
                : pending
                  ? 'Requested, waiting on approval'
                  : 'By approval'}
            </span>
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
