import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useChatRooms } from '@/hooks/useChatRooms';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';
import { PeopleSearch } from '@/components/chat/PeopleSearch';
import { RoomStrip } from '@/components/chat/RoomStrip';
import { KnockingNow } from '@/components/chat/KnockingNow';
import { UserAvatar } from '@/components/shared/UserAvatar';

const LAST_ROOM_KEY = 'summit.chat.lastRoom';

type View = { mode: 'room'; slug: string } | { mode: 'dms' } | { mode: 'dm'; slug: string };

export default function ChatPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { rooms, homeRoom, dms, dmUnread, refresh } = useChatRooms();
  const [view, setView] = useState<View | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const personParam = params.get('person');
  const clearPerson = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('person');
    setParams(next, { replace: true });
  }, [params, setParams]);

  // Chat opens straight into a room: the last one used, else the person's own team.
  useEffect(() => {
    if (view || !rooms.length) return;
    let last: string | null = null;
    try { last = localStorage.getItem(LAST_ROOM_KEY); } catch { /* storage unavailable */ }
    const slug = last && rooms.some((r) => r.slug === last) ? last : homeRoom;
    setView({ mode: 'room', slug });
  }, [view, rooms, homeRoom]);

  // A deep link to a person opens the people search over the room.
  useEffect(() => {
    if (personParam) setSearchOpen(true);
  }, [personParam]);

  const openRoom = useCallback((slug: string) => {
    setView({ mode: 'room', slug });
    setSearchOpen(false);
    try { localStorage.setItem(LAST_ROOM_KEY, slug); } catch { /* storage unavailable */ }
  }, []);

  const openDm = useCallback((slug: string) => {
    void refresh();
    setSearchOpen(false);
    setView({ mode: 'dm', slug });
  }, [refresh]);

  const activeRoomSlug = view?.mode === 'room' ? view.slug : null;
  const activeRoom = useMemo(() => rooms.find((r) => r.slug === activeRoomSlug) || null, [rooms, activeRoomSlug]);
  const activeDm = view?.mode === 'dm' ? dms.find((d) => d.slug === view.slug) || null : null;

  const strip = (
    <RoomStrip
      rooms={rooms}
      active={activeRoomSlug}
      onSelect={openRoom}
      dmUnread={dmUnread}
      dmActive={view?.mode === 'dms' || view?.mode === 'dm'}
      onOpenDms={() => setView({ mode: 'dms' })}
    />
  );

  const searchButton = (
    <button
      onClick={() => setSearchOpen((p) => !p)}
      aria-label="Find someone"
      className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
    >
      <Search className="h-4 w-4" />
    </button>
  );

  const searchPanel = searchOpen ? (
    <div className="flex-shrink-0 border-b border-border/10 px-3 py-2">
      <PeopleSearch onOpenDm={openDm} openPersonId={personParam} onPersonHandled={clearPerson} />
    </div>
  ) : null;

  // DM list
  if (view?.mode === 'dms') {
    return (
      <AppLayout fullHeight>
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-border/10 bg-background/60 px-3 py-2 backdrop-blur-2xl">
            <button
              onClick={() => openRoom(activeRoomSlug || homeRoom)}
              aria-label="Back to rooms"
              className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="flex-1 text-[15px] font-bold tracking-tight">Direct messages</h2>
            {searchButton}
          </div>
          {strip}
          {searchPanel}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <NeedsYouRow className="mx-auto w-full max-w-2xl" />
            <ul className="mx-auto mt-2 w-full max-w-2xl space-y-2">
              <li>
                <button
                  onClick={() => navigate('/app/ask')}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40"
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
              {dms.length === 0 && (
                <li className="px-1 py-6 text-center text-[13px] text-muted-foreground">
                  No direct messages yet. Use the search to find someone.
                </li>
              )}
              {dms.map((c) => (
                <li key={c.slug}>
                  <button
                    onClick={() => openDm(c.slug)}
                    className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                  >
                    <UserAvatar avatarUrl={c.avatar_url || null} fullName={c.label} size="sm" />
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
        </div>
      </AppLayout>
    );
  }

  // One DM thread
  if (view?.mode === 'dm') {
    return (
      <AppLayout fullHeight>
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1">
            <CommunityChat
              channelSlug={view.slug}
              roomLabel={activeDm?.label}
              onBack={() => setView({ mode: 'dms' })}
              composerPlaceholder={activeDm ? `Message ${activeDm.label}` : 'Message...'}
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  // The room, which is where Chat lives
  return (
    <AppLayout fullHeight>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1">
          <CommunityChat
            channelSlug={activeRoomSlug || homeRoom}
            roomLabel={activeRoom?.label}
            hideBack
            headerRight={searchButton}
            topSlot={
              <>
                {strip}
                {searchPanel}
                {activeRoom?.tone === 'mine' && <KnockingNow />}
              </>
            }
            composerPlaceholder={activeRoom ? `Message ${activeRoom.label}` : 'Message...'}
          />
        </div>
      </div>
    </AppLayout>
  );
}
