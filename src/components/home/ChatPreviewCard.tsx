import { useNavigate } from 'react-router-dom';
import { useChatChannels } from '@/hooks/useChatChannels';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';

/**
 * Pass 95 - the last line of the busiest room, one tap into chat. Replaces the
 * chat chip and the old room list on Home.
 */
export function ChatPreviewCard() {
  const navigate = useNavigate();
  const { channels, totalUnread, loading } = useChatChannels();
  if (loading) return null;

  const room =
    channels.find((c) => c.unread > 0) ||
    channels.find((c) => c.last_content) ||
    channels[0];
  if (!room) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/app/chat')}
      className="card-ice w-full p-4 text-left"
    >
      <SectionEyebrow>Chat</SectionEyebrow>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{room.label}</p>
          <p className="mt-0.5 truncate text-[15px] text-muted-foreground">
            {room.last_content
              ? `${room.last_sender ? `${room.last_sender}: ` : ''}${room.last_content}`
              : 'No messages yet'}
          </p>
        </div>
        {totalUnread > 0 && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums"
            style={{
              background: 'hsl(var(--workspace-accent) / 0.16)',
              color: 'hsl(var(--workspace-accent))',
            }}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </div>
    </button>
  );
}

export default ChatPreviewCard;
