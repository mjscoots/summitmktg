import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

/** The accent a workspace owns, used only on the active segment. */
const ACCENT: Record<string, string> = {
  Pest: '197 100% 68%',
  Fiber: '158 70% 55%',
  Life: '218 100% 56%',
};

/**
 * Pass 76 — the workspace switch as a segmented control. One row, one tap,
 * the active workspace in its own accent. Used in the desktop sidebar and the
 * phone sheet so both surfaces switch the same way.
 */
export function WorkspaceSegmented({
  collapsed,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { workspaces, activeVertical, switchWorkspace } = useWorkspace();

  if (workspaces.length < 2) return null;

  if (collapsed) {
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
    <div
      className={cn('flex items-stretch gap-0.5 rounded-xl p-0.5', className)}
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
  );
}
