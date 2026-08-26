import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WorkspacePanel } from '@/components/workspace/WorkspacePanel';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { sheetDestinations } from '@/lib/appNav';

/**
 * The top-left workspace control on phones. It switches workspaces and holds
 * every destination that is not on the bottom bar. One sheet, plain list.
 */
export function WorkspaceSheet() {
  const navigate = useNavigate();
  const { active } = useWorkspace();
  const { role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const destinations = sheetDestinations(role);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative flex min-h-11 items-center gap-1.5 overflow-hidden rounded-xl border border-border/70 bg-secondary/60 px-3 text-left transition-colors hover:bg-secondary workspace-texture"
          aria-label="Workspaces and menu"
        >
          <span className="max-w-[140px] truncate text-[13px] font-semibold text-foreground">
            {active?.name || 'Summit'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[86vw] max-w-sm overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-[15px]">Workspaces</SheetTitle>
        </SheetHeader>

        <div className="mt-3">
          <WorkspacePanel onNavigate={() => setOpen(false)} />
          <button
            onClick={() => go('/app/industries')}
            className="mt-2 min-h-11 w-full rounded-lg border border-border/60 px-3 text-left text-[13px] text-muted-foreground transition-colors hover:bg-foreground/5"
          >
            See all industries
          </button>
        </div>

        <div className="mt-6 pb-10">
          <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Go to
          </p>
          <ul className="space-y-0.5">
            {destinations.map((d) => (
              <li key={d.key}>
                <button
                  onClick={() => go(d.path)}
                  className="min-h-11 w-full rounded-lg px-3 text-left text-[14px] text-foreground transition-colors hover:bg-foreground/5"
                >
                  {d.label}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  navigate('/');
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-[14px] text-muted-foreground transition-colors hover:bg-foreground/5"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
