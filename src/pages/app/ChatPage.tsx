import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useUnreadChat } from '@/hooks/useUnreadChat';

export default function ChatPage() {
  const { markRead, setViewing } = useUnreadChat();

  useEffect(() => {
    setViewing(true);

    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'auto' });
    };

    resetScroll();
    requestAnimationFrame(resetScroll);

    return () => {
      markRead();
      setViewing(false);
    };
  }, [markRead, setViewing]);

  return (
    <AppLayout>
      <div className="h-full min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 px-0 sm:px-2 pb-2 overflow-hidden">
          <CommunityChat />
        </div>
      </div>
    </AppLayout>
  );
}
