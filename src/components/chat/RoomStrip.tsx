import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatRoom } from '@/hooks/useChatRooms';

/** Horizontal room chips under the header. One tap between rooms. */
export function RoomStrip({
  rooms,
  active,
  onSelect,
  dmUnread,
  dmActive,
  onOpenDms,
}: {
  rooms: ChatRoom[];
  active: string | null;
  onSelect: (slug: string) => void;
  dmUnread: number;
  dmActive: boolean;
  onOpenDms: () => void;
}) {
  const chip = (isActive: boolean) =>
    cn(
      'relative flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'bg-[hsl(var(--muted)/0.35)] text-foreground/70 hover:text-foreground'
    );

  return (
    <div className="flex-shrink-0 border-b border-border/10 bg-background/60 backdrop-blur-2xl">
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rooms.map((r) => {
          const isActive = !dmActive && r.slug === active;
          return (
            <button key={r.slug} onClick={() => onSelect(r.slug)} className={chip(isActive)}>
              <span className="max-w-[150px] truncate">{r.tone === 'mine' ? r.label : r.label}</span>
              {!isActive && r.unread > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />
              )}
            </button>
          );
        })}
        <button onClick={onOpenDms} className={chip(dmActive)}>
          <MessageSquare className="h-3.5 w-3.5" />
          DMs
          {dmUnread > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] font-semibold leading-4',
                dmActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary text-primary-foreground'
              )}
            >
              {dmUnread > 99 ? '99+' : dmUnread}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
