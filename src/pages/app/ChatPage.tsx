import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useChatChannels } from '@/hooks/useChatChannels';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const LAST_OPENED_KEY = 'summit.chat.lastConversation';

/** Conversations are listed in this order; anything else follows alphabetically. */
const ORDER = ['announcements', 'team', 'general', 'company', 'wins', 'awards', 'wins-awards'];

const rank = (slug: string) => {
  const i = ORDER.indexOf(slug);
  return i === -1 ? ORDER.length : i;
};

interface LastLine {
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { markRead, setViewing } = useUnreadChat();
  const { channels } = useChatChannels();
  const [openSlug, setOpenSlug] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_OPENED_KEY);
    } catch {
      return null;
    }
  });
  const [lastLines, setLastLines] = useState<Record<string, LastLine>>({});

  useEffect(() => {
    setViewing(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
    return () => {
      markRead();
      setViewing(false);
    };
  }, [markRead, setViewing]);

  // One read for the list: the most recent lines, reduced per conversation.
  useEffect(() => {
    if (openSlug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('channel, content, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (cancelled || !data) return;
      const map: Record<string, LastLine> = {};
      for (const row of data as { channel: string | null; content: string; created_at: string }[]) {
        const slug = row.channel || 'general';
        if (!map[slug]) map[slug] = { content: row.content, created_at: row.created_at };
      }
      setLastLines(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [openSlug]);

  const open = useCallback((slug: string) => {
    setOpenSlug(slug);
    try {
      localStorage.setItem(LAST_OPENED_KEY, slug);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const ordered = useMemo(
    () =>
      [...channels]
        .filter((c) => c.slug !== 'ai-coach')
        .sort((a, b) => rank(a.slug) - rank(b.slug) || a.label.localeCompare(b.label)),
    [channels]
  );

  if (openSlug) {
    return (
      <AppLayout fullHeight>
        <div className="flex h-full flex-col overflow-hidden" style={{ height: '100%', maxHeight: '100dvh' }}>
          <div className="min-h-0 flex-1">
            <CommunityChat channelSlug={openSlug} onBack={() => setOpenSlug(null)} />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl px-3 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Chat</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Conversations, updates and answers in one place.</p>

        <ul className="mt-4 space-y-2">
          <li>
            <button
              onClick={() => navigate('/app/ask')}
              className="flex w-full min-h-[56px] items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">Ask Summit</span>
                <span className="block truncate text-[12px] text-muted-foreground">
                  Answers about events, pay, training and people
                </span>
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          </li>

          {ordered.map((c) => {
            const last = lastLines[c.slug];
            return (
              <li key={c.slug}>
                <button
                  onClick={() => open(c.slug)}
                  className="flex w-full min-h-[56px] items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.label}</span>
                      {c.unread > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">
                          {c.unread > 99 ? '99+' : c.unread}
                        </span>
                      )}
                    </span>
                    <span className={cn('block truncate text-[12px] text-muted-foreground')}>
                      {last ? last.content.slice(0, 90) : 'No messages yet'}
                    </span>
                  </span>
                  {last && (
                    <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(last.created_at))}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </AppLayout>
  );
}
