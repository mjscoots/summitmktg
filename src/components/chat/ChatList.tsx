import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, Bot, ChevronRight } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ChannelAvatar } from '@/components/chat/ChannelAvatar';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';
import type { ChatConversation } from '@/hooks/useChatChannels';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || '';

/** Plain words for an attachment, so the list never shows a raw prefix. */
function previewText(row: ChatConversation): string {
  const body = (row.last_content || '').trim();
  if (!body) return 'No messages yet';
  if (body.startsWith('img:')) return 'Photo';
  if (body.startsWith('imgs:')) {
    try {
      const list = JSON.parse(body.slice('imgs:'.length));
      const n = Array.isArray(list) ? list.length : 0;
      return n > 1 ? `${n} photos` : 'Photo';
    } catch {
      return 'Photo';
    }
  }
  if (body.startsWith('video:')) return 'Video';
  if (body.startsWith('file:')) return 'File';
  if (body.startsWith('gif:')) return 'GIF';
  if (body.startsWith('sticker:')) return 'Sticker';
  if (body.startsWith('voice:')) return 'Voice note';
  if (/^\[\[WIN\|/i.test(body)) return body.replace(/^\[\[WIN\|[0-9a-f-]+\]\]/i, '').trim();
  if (/^\[\[AWARDS\|/i.test(body)) return 'Weekly awards';
  return body.replace(/\s+/g, ' ');
}

function stamp(at: string | null): string {
  if (!at) return '';
  const date = new Date(at);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

/**
 * The chat home: every room and direct message as one row, newest talk first.
 * The list is the navigation, so there is no room strip anywhere.
 */
export function ChatList({
  conversations,
  onOpen,
}: {
  conversations: ChatConversation[];
  onOpen: (slug: string) => void;
}) {
  const navigate = useNavigate();
  const { activeVertical, switchWorkspace } = useWorkspace();

  const mine = useMemo(
    () =>
      conversations.filter(
        (c) => c.kind === 'dm' || !c.vertical || c.vertical === (activeVertical || 'Pest')
      ),
    [conversations, activeVertical]
  );

  /** Rooms in another workspace stay counted, collapsed into one line each. */
  const elsewhere = useMemo(() => {
    const tally = new Map<string, number>();
    conversations.forEach((c) => {
      if (c.kind === 'dm' || !c.vertical) return;
      if (c.vertical === (activeVertical || 'Pest')) return;
      if (c.is_muted) return;
      tally.set(c.vertical, (tally.get(c.vertical) || 0) + (c.unread || 0));
    });
    return [...tally.entries()].filter(([, n]) => n > 0).sort((a, b) => a[0].localeCompare(b[0]));
  }, [conversations, activeVertical]);

  const rows = useMemo(
    () =>
      [...mine]
        .filter((c) => c.slug !== 'ai-coach')
        .sort((a, b) => {
          const at = a.last_at ? new Date(a.last_at).getTime() : 0;
          const bt = b.last_at ? new Date(b.last_at).getTime() : 0;
          if (bt !== at) return bt - at;
          return a.label.localeCompare(b.label);
        }),
    [mine]
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <NeedsYouRow className="!px-0" />

      <ul className="mt-2 divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card">
        {rows.map((row) => {
          const sender = firstName(row.last_sender);
          const preview = previewText(row);
          const muted = Boolean(row.is_muted);
          const loud = row.unread > 0 && !muted;
          return (
            <li key={row.slug}>
              <button
                type="button"
                onClick={() => onOpen(row.slug)}
                className="flex min-h-[68px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-elevated))]"
              >
                <ChannelAvatar
                  name={row.label}
                  coverPath={row.kind === 'dm' ? null : row.cover_image_path}
                  avatarUrl={row.kind === 'dm' ? row.avatar_url : null}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
                      {row.label}
                    </span>
                    {muted && <BellOff className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
                    <span
                      className={cn(
                        'flex-shrink-0 text-[11px] tabular-nums',
                        loud ? 'font-semibold text-[hsl(var(--ice))]' : 'text-muted-foreground'
                      )}
                    >
                      {stamp(row.last_at)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[13px]',
                        loud ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {row.last_content && sender && row.kind !== 'dm' ? `${sender}: ${preview}` : preview}
                    </span>
                    {loud && (
                      <span
                        className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
                        style={{
                          background: 'hsl(var(--ice))',
                          color: 'hsl(var(--primary-foreground))',
                        }}
                      >
                        {row.unread > 99 ? '99+' : row.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}



        {elsewhere.map(([vertical, unread]) => (
          <li key={`elsewhere-${vertical}`}>
            <button
              type="button"
              onClick={() => switchWorkspace(vertical)}
              className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-elevated))]"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                {unread} unread in {vertical}. Switch workspace to read it.
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}

        {rows.length === 0 && (
          <li className="px-3 py-8 text-center text-[13px] text-muted-foreground">
            No conversations yet.
          </li>
        )}

        <li>
          <button
            type="button"
            onClick={() => navigate('/app/ask')}
            className="flex min-h-[64px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-elevated))]"
          >
            <span
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: 'hsl(var(--ice) / 0.14)', color: 'hsl(var(--ice))' }}
            >
              <Bot className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-foreground">Ask Summit</span>
              <span className="block truncate text-[13px] text-muted-foreground">
                Answers about events, pay, training and people
              </span>
            </span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </li>
      </ul>
    </div>
  );
}

export default ChatList;
