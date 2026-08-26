import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useChatChannels } from '@/hooks/useChatChannels';

const LAST_OPENED_KEY = 'summit.chat.lastConversation';

/** Conversations are listed in this order; anything else follows alphabetically. */
const ORDER = ['announcements', 'team', 'general', 'company', 'wins', 'awards', 'wins-awards'];

const rank = (slug: string) => {
  const i = ORDER.indexOf(slug);
  return i === -1 ? ORDER.length : i;
};

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
                    {c.last_content && (
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {c.last_sender ? `${c.last_sender}: ` : ''}{c.last_content.slice(0, 90)}
                      </span>
                    )}
                  </span>
                  {c.last_at && (
                    <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(c.last_at))}
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
