import { Pin, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ChatHeaderProps {
  channelName: string;
  subtitle?: string;
  pinnedCount: number;
  onPinnedClick?: () => void;
  memberCount?: number;
}

export function ChatHeader({ channelName, subtitle, pinnedCount, onPinnedClick, memberCount }: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border/10 bg-background/60 backdrop-blur-2xl flex-shrink-0 z-[2]">
      {/* Back arrow - mobile feel */}
      <button
        onClick={() => navigate('/app')}
        className="p-1 -ml-1 rounded-full text-primary hover:bg-primary/10 transition-colors lg:hidden"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

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
