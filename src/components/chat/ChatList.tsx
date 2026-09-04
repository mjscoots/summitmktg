import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Bot, ChevronRight, Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isYesterday } from 'date-fns';
import { ChannelAvatar } from '@/components/chat/ChannelAvatar';
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
  return body.replace(/^\p{Extended_Pictographic}\s*(?=Poll:)/u, '').replace(/\s+/g, ' ');
}

function stamp(at: string | null): string {
  if (!at) return '';
  const date = new Date(at);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

/**
 * One conversation row. Swiping left reveals mute and pin, both with a
 * server side writer scoped to the caller's own row.
 */
function ConversationRow({
  row,
  onOpen,
  onMuteChanged,
}: {
  row: ChatConversation;
  onOpen: (slug: string) => void;
  onMuteChanged?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const startX = useRef<number | null>(null);
  const sender = firstName(row.last_sender);
  const preview = previewText(row);
  const muted = Boolean(row.is_muted);
  const pinnedRow = Boolean(row.is_pinned);
  const loud = row.unread > 0 && !muted;

  const toggleMute = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('set_channel_mute', { _slug: row.slug, _muted: !muted });
    setBusy(false);
    if (error) {
      toast.error('That did not save. Try again.');
      return;
    }
    setRevealed(false);
    onMuteChanged?.();
  };

  const togglePin = async () => {
    if (busy || !row.channel_id) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('set_channel_pin', {
      _channel_id: row.channel_id,
      _pinned: !pinnedRow,
    });
    setBusy(false);
    if (error) {
      toast.error('That did not save. Try again.');
      return;
    }
    setRevealed(false);
    onMuteChanged?.();
  };

  const actionWidth = row.channel_id ? 176 : 88;

  return (
    <li className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={toggleMute}
          disabled={busy}
          aria-label={muted ? `Unmute ${row.label}` : `Mute ${row.label}`}
          className="flex min-h-11 w-[88px] flex-col items-center justify-center gap-1 bg-muted text-[11px] font-semibold text-muted-foreground"
        >
          {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
        {row.channel_id && (
          <button
            type="button"
            onClick={togglePin}
            disabled={busy}
            aria-label={pinnedRow ? `Unpin ${row.label}` : `Pin ${row.label}`}
            className="flex min-h-11 w-[88px] flex-col items-center justify-center gap-1 bg-[hsl(var(--surface-elevated))] text-[11px] font-semibold text-foreground"
          >
            {pinnedRow ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {pinnedRow ? 'Unpin' : 'Pin'}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => (revealed ? setRevealed(false) : onOpen(row.slug))}
        onTouchStart={(e) => { startX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const from = startX.current;
          startX.current = null;
          const to = e.changedTouches[0]?.clientX;
          if (from == null || to == null) return;
          if (from - to > 48) setRevealed(true);
          if (to - from > 48) setRevealed(false);
        }}
        className={cn(
          'press relative flex min-h-[72px] w-full items-center gap-3 bg-card px-3 py-2.5 text-left transition-transform duration-200 hover:bg-[hsl(var(--surface-elevated))]'
        )}
        style={revealed ? { transform: `translateX(-${actionWidth}px)` } : undefined}
      >
        <ChannelAvatar
          name={row.label}
          coverPath={row.kind === 'dm' ? null : row.cover_image_path}
          avatarUrl={row.kind === 'dm' ? row.avatar_url : null}
          online={row.kind === 'dm' && Boolean(row.other_is_active)}
          size="md"
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {row.is_pinned && <Pin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
              {row.label}
            </span>
            {muted && <BellOff className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
            <span
              className={cn(
                'flex-shrink-0 text-[12px] tabular-nums',
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
                  background: 'hsl(var(--workspace-accent))',
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
}

/**
 * The chat home: every room and direct message as one row, newest talk first.
 * The list is the navigation, so there is no room strip anywhere.
 */
export function ChatList({
  conversations,
  onOpen,
  onMuteChanged,
}: {
  conversations: ChatConversation[];
  onOpen: (slug: string) => void;
  /** Refresh the list after a row level change. */
  onMuteChanged?: () => void;
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

  const pinned = useMemo(() => rows.filter((r) => r.is_pinned), [rows]);
  const rest = useMemo(() => rows.filter((r) => !r.is_pinned), [rows]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ul className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card">
        {pinned.length > 0 && (
          <li className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pinned
          </li>
        )}
        {pinned.map((row) => (
          <ConversationRow key={row.slug} row={row} onOpen={onOpen} onMuteChanged={onMuteChanged} />
        ))}
        {rest.map((row) => (
          <ConversationRow key={row.slug} row={row} onOpen={onOpen} onMuteChanged={onMuteChanged} />
        ))}



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
