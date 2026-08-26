import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WorkspaceMenu } from '@/components/workspace/WorkspaceMenu';
import { useAuth } from '@/hooks/useAuth';
import { drawerDestinations } from '@/lib/appNav';

/**
 * The top-left control on phones: a small icon button that slides in the
 * navigation drawer. The workspace is one compact line at the top of the
 * drawer, not a banner.
 */
export function WorkspaceSheet() {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const destinations = drawerDestinations(role);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[80vw] max-w-xs overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="sr-only">Menu</SheetTitle>
        </SheetHeader>

        <div className="-mx-1 mt-1 border-b border-border/60 pb-2">
          <WorkspaceMenu />
        </div>

        <div className="mt-3 pb-10">
          <ul className="space-y-0.5">
            {destinations.map((d) => (
              <li key={d.key}>
                <button
                  onClick={() => go(d.path)}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[14px] text-foreground transition-colors hover:bg-foreground/5"
                >
                  <d.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
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
                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[14px] text-muted-foreground transition-colors hover:bg-foreground/5"
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
