import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WarModeToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function WarModeToggle({ active, onToggle }: WarModeToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border",
            active
              ? "bg-red-500/15 text-primary border-red-500/40 shadow-[0_0_12px_-3px_rgba(239,68,68,0.3)]"
              : "bg-muted/30 text-muted-foreground border-border/30 hover:border-border/60 hover:text-foreground"
          )}
        >
          <Swords className={cn("w-3.5 h-3.5", active && "animate-pulse")} />
          War Mode
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {active ? 'Showing deals only — click to exit' : 'Focus on deals only — hide chatter'}
      </TooltipContent>
    </Tooltip>
  );
}
