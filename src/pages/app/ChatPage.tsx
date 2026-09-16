import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useChatChannels } from '@/hooks/useChatChannels';
import { PeopleSearch } from '@/components/chat/PeopleSearch';
import { ChatList } from '@/components/chat/ChatList';
import { ChannelAvatar } from '@/components/chat/ChannelAvatar';
import { ChannelSheet } from '@/components/chat/ChannelSheet';
import { KnockingNow } from '@/components/chat/KnockingNow';
import { NewChatSheet } from '@/components/chat/NewChatSheet';

export default function ChatPage() {
  const [params, setParams] = useSearchParams();
  const { channels, refresh, loading } = useChatChannels();
  // The open room lives in the address, so a refresh and a shared link both work.
  const openSlug = params.get('room');
  const [searchOpen, setSearchOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  // A deep link that means "say something" opens the room with the composer ready.
  const [composeOnOpen] = useState(() => params.get('compose') === '1');


  const personParam = params.get('person');
  const clearPerson = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('person');
    setParams(next, { replace: true });
  }, [params, setParams]);

  // A deep link to a person opens the people search over the list.
  useEffect(() => {
    if (personParam) setSearchOpen(true);
  }, [personParam]);

  const openRoom = useCallback((slug: string) => {
    setSearchOpen(false);
    const next = new URLSearchParams(window.location.search);
    next.set('room', slug);
    // Replace, so back goes to the list in one step rather than every room visited.
    setParams(next, { replace: true });
  }, [setParams]);



  const openDm = useCallback((slug: string) => {
    void refresh();
    openRoom(slug);
  }, [refresh, openRoom]);

  const backToList = useCallback(() => {
    setOpenSlug(null);
    setMembersOpen(false);
    void refresh();
  }, [refresh]);

  const active = useMemo(
    () => (openSlug ? channels.find((c) => c.slug === openSlug) || null : null),
    [channels, openSlug]
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

  // One room, WhatsApp style: back to the list, tap the name for members.
  if (openSlug) {
    const isDm = active?.kind === 'dm';
    const label = active?.label || 'Chat';
    return (
      <AppLayout fullHeight>
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1">
            <CommunityChat
              channelSlug={openSlug}
              roomLabel={label}
              autoFocusComposer={composeOnOpen}
              onBack={backToList}
              isDm={isDm}
              headerAvatar={
                <ChannelAvatar
                  name={label}
                  coverPath={isDm ? null : active?.cover_image_path}
                  avatarUrl={isDm ? active?.avatar_url : null}
                  size="sm"
                />
              }
              onHeaderTitleClick={() => setMembersOpen(true)}
              topSlot={active?.kind === 'team' ? <KnockingNow /> : null}
              composerPlaceholder={`Message ${label}`}
            />
          </div>
          <ChannelSheet
            slug={openSlug}
            open={membersOpen}
            onOpenChange={setMembersOpen}
            onCoverChanged={refresh}
            onRoomDeleted={backToList}
          />
        </div>
      </AppLayout>
    );
  }

  // The chat home is the list.
  return (
    <AppLayout fullHeight>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center gap-2 bg-background px-5 py-3">
          <h1 className="flex-1 text-[17px] font-bold tracking-tight">Chats</h1>
          <button
            onClick={() => setNewOpen(true)}
            aria-label="New chat"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
          {searchButton}
        </div>

        <NewChatSheet open={newOpen} onOpenChange={setNewOpen} onOpenRoom={openDm} />


        {searchOpen && (
          <div className="flex-shrink-0 px-5 py-3">
            <div className="mx-auto w-full max-w-2xl">
              <PeopleSearch onOpenDm={openDm} openPersonId={personParam} onPersonHandled={clearPerson} />
            </div>
          </div>
        )}

        <div className="phone-bar-clear min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!loading && <ChatList conversations={channels} onOpen={openRoom} onMuteChanged={refresh} />}
        </div>
      </div>
    </AppLayout>
  );
}
