import { useState } from 'react';
import { useWorkspace, Workspace, isMember } from '@/contexts/WorkspaceContext';
import { VerticalApplicationForm } from './VerticalApplicationForm';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Circle, Lock } from 'lucide-react';

function statusLine(w: Workspace): string {
  switch (w.membership_status) {
    case 'active':
      return 'Active';
    case 'onboarding':
      return 'In setup';
    case 'approved':
      return 'Approved';
    case 'paused':
      return 'Paused';
    default:
      return '';
  }
}

export function WorkspacePanel({ onNavigate }: { onNavigate?: () => void }) {
  const { workspaces, activeVertical, switchWorkspace, refresh } = useWorkspace();
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  const mine = workspaces.filter(isMember);
  const locked = workspaces.filter((w) => !isMember(w));

  const select = async (w: Workspace) => {
    await switchWorkspace(w.vertical);
    onNavigate?.();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Your workspaces
        </p>
        {mine.length === 0 && (
          <p className="text-[13px] text-muted-foreground">No workspaces yet.</p>
        )}
        {mine.map((w) => {
          const active = w.vertical === activeVertical;
          return (
            <button
              key={w.vertical}
              onClick={() => select(w)}
              className={cn(
                'flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                active
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border/60 hover:bg-foreground/5'
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-foreground">{w.name}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {statusLine(w)}
                  {w.is_president ? ` · You lead this industry` : ''}
                </span>
              </span>
              {active && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      {locked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Other industries
          </p>
          {locked.map((w) => {
            const applied = w.membership_status === 'applied';
            const rejected = w.membership_status === 'rejected';
            const comingSoon = w.status === 'coming_soon';
            return (
              <div key={w.vertical} className="rounded-lg border border-border/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-medium text-foreground">{w.name}</p>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {comingSoon && <p className="mt-1 text-[12px] text-muted-foreground">Opening soon</p>}

                {!comingSoon && applied && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[12px] text-muted-foreground">
                      Waiting on {w.approvers.map((a) => a.name || 'approver').join(' and ')}
                    </p>
                    <ul className="space-y-1">
                      {w.approvers.map((a) => (
                        <li key={a.user_id} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          {a.decision === 'approved' ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          {a.name || 'Approver'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!comingSoon && rejected && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[12px] text-muted-foreground">
                      {w.reject_reason || 'Not approved.'}
                    </p>
                    <p className="text-[12px] text-muted-foreground">Talk to your manager.</p>
                  </div>
                )}

                {!comingSoon && !applied && applyingTo !== w.vertical && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 min-h-11 w-full"
                    onClick={() => setApplyingTo(w.vertical)}
                  >
                    Apply for {w.short_name}
                  </Button>
                )}

                {applyingTo === w.vertical && (
                  <div className="mt-3">
                    <VerticalApplicationForm
                      vertical={w.vertical}
                      name={w.name}
                      onCancel={() => setApplyingTo(null)}
                      onDone={() => {
                        setApplyingTo(null);
                        refresh();
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
