import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WorkspacePanel } from './WorkspacePanel';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkspaceSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { active, workspaces } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (!active || workspaces.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/5',
            collapsed && 'justify-center px-0'
          )}
        >
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/70">
              {active.name}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-white/50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-3">
        <WorkspacePanel onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
