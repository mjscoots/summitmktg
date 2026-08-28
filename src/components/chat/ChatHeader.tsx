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
  /** Cover photo or avatar shown beside the room name. */
  avatarSlot?: ReactNode;
  /** Tap the name to open the room's members. */
  onTitleClick?: () => void;
}

export function ChatHeader({ channelName, subtitle, pinnedCount, onPinnedClick, memberCount, onBack, hideBack, rightSlot, avatarSlot, onTitleClick }: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/10 bg-background/60 backdrop-blur-2xl flex-shrink-0 z-[2]">
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

      <button
        type="button"
        onClick={onTitleClick}
        disabled={!onTitleClick}
        aria-label={onTitleClick ? `${channelName} members` : undefined}
        className={cn(
          'flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 text-left transition-colors',
          onTitleClick && 'hover:bg-[hsl(var(--surface-elevated))]'
        )}
      >
        {avatarSlot}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold leading-tight tracking-tight text-foreground">{channelName}</span>
          {subtitle && (
            <span className="block truncate text-[11px] leading-tight text-muted-foreground">
              {subtitle}
              {memberCount ? ` · ${memberCount} members` : ''}
            </span>
          )}
        </span>
      </button>

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
        {rightSlot}
      </div>

    </div>
  );
}
