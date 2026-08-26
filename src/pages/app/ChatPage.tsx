import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, ChevronRight } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useChatChannels } from '@/hooks/useChatChannels';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';
import { PeopleSearch } from '@/components/chat/PeopleSearch';
import { UserAvatar } from '@/components/shared/UserAvatar';

const LAST_OPENED_KEY = 'summit.chat.lastConversation';

/** Conversations are listed in this order; anything else follows alphabetically. DMs last. */
const ORDER = ['announcements', 'team', 'general', 'company', 'wins', 'awards', 'wins-awards'];

const rank = (c: { slug: string; kind: string }) => {
  if (c.kind === 'dm') return ORDER.length + 1;
  const i = ORDER.indexOf(c.slug);
  return i === -1 ? ORDER.length : i;
};

export default function ChatPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { channels, refresh } = useChatChannels();
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

  const personParam = params.get('person');
  const clearPerson = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('person');
    setParams(next, { replace: true });
  }, [params, setParams]);

  // A deep link to a person lands on the list, not on the last opened thread.
  useEffect(() => {
    if (personParam) setOpenSlug(null);
  }, [personParam]);

  const openDm = useCallback((slug: string) => {
    void refresh();
    open(slug);
  }, [open, refresh]);

  const ordered = useMemo(
    () =>
      [...channels]
        .filter((c) => c.slug !== 'ai-coach')
        .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label)),
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
      <NeedsYouRow className="mx-auto w-full max-w-2xl" />
      <div className="mx-auto w-full max-w-2xl px-3 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Chat</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Conversations, updates and answers in one place.</p>

        <div className="mt-3">
          <PeopleSearch onOpenDm={openDm} openPersonId={personParam} onPersonHandled={clearPerson} />
        </div>

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

          {ordered.map((c) => (
            <li key={c.slug}>
              <button
                onClick={() => open(c.slug)}
                className="flex w-full min-h-[56px] items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40"
              >
                {c.kind === 'dm' && (
                  <UserAvatar avatarUrl={c.avatar_url || null} fullName={c.label} size="sm" />
                )}
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
          ))}
        </ul>
      </div>
    </AppLayout>
  );
}
