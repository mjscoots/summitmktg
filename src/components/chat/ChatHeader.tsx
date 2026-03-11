import { Pin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  channelName: string;
  subtitle?: string;
  pinnedCount: number;
  onPinnedClick?: () => void;
}

export function ChatHeader({ channelName, subtitle, pinnedCount, onPinnedClick }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/15 bg-background/80 backdrop-blur-xl flex-shrink-0 z-[2]">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{channelName}</h2>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {pinnedCount > 0 && (
          <button
            onClick={onPinnedClick}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-amber-500/70 hover:bg-amber-500/10 transition-colors"
          >
            <Pin className="w-3 h-3" />
            {pinnedCount}
          </button>
        )}
      </div>
    </div>
  );
}
