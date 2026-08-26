import { Pin, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface ChatHeaderProps {
  channelName: string;
  subtitle?: string;
  pinnedCount: number;
  onPinnedClick?: () => void;
  memberCount?: number;
  /** Back to the conversation list. Falls back to the dashboard. */
  onBack?: () => void;
  /** Hide the back control when the room is the landing surface. */
  hideBack?: boolean;
  /** Extra controls on the right, e.g. people search. */
  rightSlot?: ReactNode;
}

export function ChatHeader({ channelName, subtitle, pinnedCount, onPinnedClick, memberCount, onBack, hideBack, rightSlot }: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border/10 bg-background/60 backdrop-blur-2xl flex-shrink-0 z-[2]">
      {/* Back arrow - mobile feel */}
      {!hideBack && (
        <button
          onClick={() => (onBack ? onBack() : navigate('/app'))}
          aria-label="Back"
          className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}


      <div className="flex-1 min-w-0">
        <h2 className="text-[15px] font-bold text-foreground tracking-tight leading-tight">{channelName}</h2>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/40 leading-tight">
            {subtitle}
            {memberCount ? ` · ${memberCount} members` : ''}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {pinnedCount > 0 && (
          <button
            onClick={onPinnedClick}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-primary/60 hover:bg-primary/10 transition-colors"
          >
            <Pin className="w-3 h-3" />
            {pinnedCount}
          </button>
        )}
      </div>
    </div>
  );
}
