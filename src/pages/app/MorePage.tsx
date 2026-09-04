import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, MessageSquare, Settings } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { moreGroups } from '@/lib/appNav';
import { WorkspaceSegmented } from '@/components/workspace/WorkspaceSegmented';
import { InstallAppHint } from '@/components/shared/InstallAppHint';
import { ViewAsSwitcher } from '@/components/layout/ViewAsSwitcher';
import { SettingsList } from '@/components/settings/SettingsList';

const storeKey = (title: string) => `more:open:${title.toLowerCase().replace(/\s+/g, '-')}`;

/**
 * More: everything the phone bar does not carry, grouped by the job it belongs
 * to. Each group collapses, the first one opens by default, and the open state
 * is remembered per group.
 */
export default function MorePage() {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const { activeVertical } = useWorkspace();
  const groups = moreGroups(activeVertical, role);

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    groups.forEach((g, i) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(storeKey(g.title));
      } catch {
        stored = null;
      }
      next[g.title] = stored === null ? i === 0 : stored === '1';
    });
    return next;
  });

  const toggle = useCallback((title: string) => {
    setOpen((prev) => {
      const value = !prev[title];
      try {
        localStorage.setItem(storeKey(title), value ? '1' : '0');
      } catch {
        // A private window with no storage still toggles for this visit.
      }
      return { ...prev, [title]: value };
    });
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="More" context="Every other place in the app." />

        <InstallAppHint />

        <div className="lg:hidden">
          <WorkspaceSegmented />
        </div>

        {groups.map((group) => {
          const isOpen = Boolean(open[group.title]);
          const isSettings = group.title === 'Settings';
          return (
            <Collapsible
              key={group.title}
              open={isOpen}
              onOpenChange={() => toggle(group.title)}
              className="space-y-2"
            >
              <CollapsibleTrigger className="press flex min-h-[52px] w-full items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 text-left transition-colors hover:bg-secondary">
                {isSettings && (
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-muted-foreground">
                    <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                )}
                <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </span>
                <span className="text-[13px] tabular-nums text-muted-foreground">{group.items.length}</span>
                <ChevronRight
                  className={
                    'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ' +
                    (isOpen ? 'rotate-90' : '')
                  }
                />
              </CollapsibleTrigger>

              <CollapsibleContent className="overflow-hidden data-[state=open]:collapse-open data-[state=closed]:collapse-closed">
                {isSettings ? (
                  <SettingsList />
                ) : (
                  <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
                    {group.items.map((item, i) => (
                      <button
                        key={item.key}
                        onClick={() => navigate(item.path)}
                        className={
                          'press flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-secondary' +
                          (i > 0 ? ' border-t border-border' : '')
                        }
                      >
                        <span
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                          style={{
                            background: 'hsl(var(--workspace-accent) / 0.12)',
                            color: 'hsl(var(--workspace-accent))',
                          }}
                        >
                          <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </span>
                        <span className="flex-1 truncate text-[15px] text-foreground">{item.label}</span>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        <ViewAsSwitcher />

        <FeedbackDialog
          trigger={
            <button className="w-full rounded-[var(--radius)] border border-border bg-card p-4 text-left transition-colors hover:bg-secondary">
              <span className="flex items-center gap-3">
                <MessageSquare className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
                <span className="text-[15px] text-foreground">Report an issue or idea</span>
              </span>
              <span className="mt-1 block pl-[30px] text-[13px] text-muted-foreground">
                Bugs, ideas, or anything confusing. We read every one.
              </span>
            </button>
          }
        />

        <button
          onClick={async () => {
            await signOut();
            navigate('/');
          }}
          className="flex min-h-[52px] w-full items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 text-left text-[15px] text-muted-foreground transition-colors hover:bg-secondary"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </AppLayout>
  );
}
