import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WorkspacePanel } from './WorkspacePanel';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

/**
 * One compact line: "Summit Pest ▾". Opens the workspace list.
 * Used at the top of the desktop sidebar and at the top of the phone drawer.
 * Never a banner.
 */
export function WorkspaceMenu({
  collapsed,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { active, workspaces } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (workspaces.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Switch workspace"
          className={cn(
            'flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-foreground/5',
            collapsed && 'justify-center px-0',
            className
          )}
        >
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-foreground">
              {active?.name || 'Summit'}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[290px] p-3">
        <WorkspacePanel onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
