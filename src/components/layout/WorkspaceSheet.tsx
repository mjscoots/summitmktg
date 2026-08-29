import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WorkspaceSegmented } from '@/components/workspace/WorkspaceSegmented';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { moreGroups, phoneBar } from '@/lib/appNav';

/**
 * The top-left control on phones: a small icon button that slides in the
 * navigation drawer. It carries the same destination model as the More
 * screen, so nothing is reachable in one place and missing in the other.
 */
export function WorkspaceSheet() {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { activeVertical } = useWorkspace();
  const bar = phoneBar(activeVertical).filter((d) => d.key !== 'more');
  const groups = [{ title: 'Daily', items: bar }, ...moreGroups(activeVertical, role)];

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[80vw] max-w-xs overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="sr-only">Menu</SheetTitle>
        </SheetHeader>

        <div className="mt-1 border-b border-border pb-3">
          <WorkspaceSegmented />
        </div>

        <div className="mt-3 space-y-4 pb-10">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="eyebrow px-3 pb-1">{group.title}</p>
              <ul className="space-y-0.5">
                {group.items.map((d) => (
                  <li key={d.key}>
                    <button
                      onClick={() => go(d.path)}
                      className="flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius)] px-3 text-left text-[14px] text-foreground transition-colors hover:bg-secondary"
                    >
                      <d.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      {d.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate('/');
            }}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius)] px-3 text-left text-[14px] text-muted-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

