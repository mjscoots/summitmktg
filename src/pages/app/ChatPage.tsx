import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { PageBackButton } from '@/components/shared/PageBackButton';

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
    <AppLayout fullHeight>
      <div className="h-full flex flex-col overflow-hidden" style={{ height: '100%', maxHeight: '100dvh' }}>
        {/* Back Button - positioned at top */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <PageBackButton to="/app" label="Dashboard" />
        </div>
        <div className="flex-1 min-h-0">
          <CommunityChat />
        </div>
      </div>
    </AppLayout>
  );
}
